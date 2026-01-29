import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Project } from './project.model';
import { ProjectSettings, DEFAULT_NON_WORKING_DAYS } from './project-settings.model';
import { CreateProjectDto, UpdateProjectDto, CreateProjectSettingsDto, UpdateProjectSettingsDto } from './project.dto';
import { EVALUATION_THRESHOLDS, getWorstStatus } from '../../config/evaluation-thresholds';
import { PhaseService } from '../phase/phase.service';

@Injectable()
export class ProjectService {
  constructor(
    @Inject('PROJECT_REPOSITORY')
    private projectRepository: typeof Project,
    @Inject('PROJECT_SETTINGS_REPOSITORY')
    private projectSettingsRepository: typeof ProjectSettings,
    @Inject(forwardRef(() => PhaseService))
    private phaseService: PhaseService,
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectRepository.findAll({
      include: [
        { model: ProjectSettings, as: 'settings' },
      ],
    });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepository.findByPk(id, {
      include: [
        { model: ProjectSettings, as: 'settings' },
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  // Default phases to create for new projects
  private readonly DEFAULT_PHASES = [
    { name: 'Requirement', displayOrder: 1 },
    { name: 'Functional Design', displayOrder: 2 },
    { name: 'Coding', displayOrder: 3 },
    { name: 'Unit Test', displayOrder: 4 },
    { name: 'Integration Test', displayOrder: 5 },
    { name: 'System Test', displayOrder: 6 },
    { name: 'User Test', displayOrder: 7 },
  ];

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    // Create the project
    const project = await this.projectRepository.create(createProjectDto as any);

    // Create default phases for the new project
    await this.createDefaultPhases(project.id);

    // Create default settings
    await this.projectSettingsRepository.create({
      projectId: project.id,
      numberOfMembers: 5,
      workingHoursPerDay: 8,
      workingDaysPerMonth: 20,
      defaultEffortUnit: 'man-hour',
      nonWorkingDays: DEFAULT_NON_WORKING_DAYS,
      holidays: [],
    } as any);

    return project;
  }

  /**
   * Create default phases for a new project
   */
  async createDefaultPhases(projectId: number): Promise<void> {
    for (const phase of this.DEFAULT_PHASES) {
      await this.phaseService.create({
        projectId,
        name: phase.name,
        startDate: new Date(),
        estimatedEffort: 0,
      });
    }
  }

  async update(id: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    await project.update(updateProjectDto);
    return project;
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);
    await project.destroy();
  }

  // Project Settings methods
  async createSettings(createSettingsDto: CreateProjectSettingsDto): Promise<ProjectSettings> {
    return this.projectSettingsRepository.create(createSettingsDto as any);
  }

  async updateSettings(projectId: number, updateSettingsDto: UpdateProjectSettingsDto): Promise<ProjectSettings> {
    // Find existing settings or create new one (upsert behavior)
    let settings = await this.projectSettingsRepository.findOne({
      where: { projectId },
    });

    if (!settings) {
      // Create new settings with default values and apply updates
      settings = await this.projectSettingsRepository.create({
        projectId,
        numberOfMembers: 5,
        workingHoursPerDay: 8,
        workingDaysPerMonth: 20,
        defaultEffortUnit: 'man-hour',
        nonWorkingDays: DEFAULT_NON_WORKING_DAYS,
        holidays: [],
        ...updateSettingsDto,
      } as any);
      return settings;
    }

    await settings.update(updateSettingsDto);
    return settings;
  }

  async getSettings(projectId: number): Promise<ProjectSettings> {
    let settings = await this.projectSettingsRepository.findOne({
      where: { projectId },
    });

    // Auto-create default settings if not found
    if (!settings) {
      settings = await this.projectSettingsRepository.create({
        projectId,
        numberOfMembers: 5,
        workingHoursPerDay: 8,
        workingDaysPerMonth: 20,
        defaultEffortUnit: 'man-hour',
        nonWorkingDays: DEFAULT_NON_WORKING_DAYS,
        holidays: [],
      } as any);
    }

    return settings;
  }

  /**
   * Calculate end date based on start date and estimated effort
   * Skips non-working days (weekends) and holidays
   */
  async calculateEndDate(params: {
    startDate: string;
    estimatedEffortDays: number;
    projectId?: number;
    nonWorkingDays?: number[];
    holidays?: string[];
  }): Promise<{ endDate: string; workingDays: number; totalDays: number }> {
    const { startDate, estimatedEffortDays, projectId } = params;

    // Get non-working days and holidays from settings or params
    let nonWorkingDays = params.nonWorkingDays ?? DEFAULT_NON_WORKING_DAYS;
    let holidays: string[] = params.holidays ?? [];

    // If projectId is provided, get settings from database
    if (projectId) {
      const settings = await this.getSettings(projectId);
      nonWorkingDays = settings.nonWorkingDays || DEFAULT_NON_WORKING_DAYS;
      holidays = settings.holidays || [];
    }

    // Convert holidays to Set for faster lookup
    const holidaySet = new Set(holidays);

    // Start from the given date
    const start = new Date(startDate);
    let currentDate = new Date(start);
    let workingDaysCount = 0;

    // If estimated effort is 0 or negative, return start date
    if (estimatedEffortDays <= 0) {
      return {
        endDate: startDate,
        workingDays: 0,
        totalDays: 0,
      };
    }

    // Count working days until we reach the estimated effort
    while (workingDaysCount < estimatedEffortDays) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if this is a working day
      const isNonWorkingDay = nonWorkingDays.includes(dayOfWeek);
      const isHoliday = holidaySet.has(dateStr);

      if (!isNonWorkingDay && !isHoliday) {
        workingDaysCount++;
      }

      // Move to next day if we haven't reached the target
      if (workingDaysCount < estimatedEffortDays) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Calculate total calendar days
    const totalDays = Math.floor((currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return {
      endDate: currentDate.toISOString().split('T')[0],
      workingDays: workingDaysCount,
      totalDays,
    };
  }

  /**
   * Evaluate project status based on simple Actual vs Estimated comparison
   * Returns: 'Good' | 'Warning' | 'At Risk'
   *
   * Simplified logic:
   * - expectedEffort = estimatedEffort × (progress / 100)
   * - Good: actualEffort ≤ expectedEffort (efficiency ≥ 100%)
   * - Warning: actualEffort > expectedEffort but < 120% (efficiency 83-100%)
   * - At Risk: actualEffort ≥ 120% expectedEffort (efficiency < 83%)
   */
  evaluateProjectStatus(metrics: {
    schedulePerformanceIndex: number;  // SPI (kept for compatibility)
    costPerformanceIndex: number;      // CPI - this is the key metric (efficiency)
    delayRate: number;                 // % (kept for compatibility)
    passRate: number;                  // %
  }): 'Good' | 'Warning' | 'At Risk' {
    const { costPerformanceIndex: cpi, passRate } = metrics;

    // CPI = Earned Value / Actual Cost = (Estimated × Progress) / Actual
    // CPI >= 1.0 means on or under budget (Good)
    // CPI 0.83-1.0 means slightly over budget (Warning) - equivalent to 100-120% actual
    // CPI < 0.83 means significantly over budget (At Risk) - equivalent to >120% actual

    // Also consider pass rate for quality issues
    const hasQualityIssue = passRate > 0 && passRate < 80;

    // At Risk: CPI < 0.83 (>20% over budget) OR serious quality issues
    if (cpi < 0.83 || hasQualityIssue) {
      return 'At Risk';
    }

    // Warning: CPI 0.83-1.0 (slightly over budget) OR minor quality concerns
    if (cpi < 1.0 || (passRate > 0 && passRate < 95)) {
      return 'Warning';
    }

    // Good: CPI >= 1.0 (on or under budget) AND good quality
    return 'Good';
  }

  /**
   * Update project status based on current metrics
   */
  async updateProjectStatus(
    projectId: number,
    metrics: {
      schedulePerformanceIndex: number;
      costPerformanceIndex: number;
      delayRate: number;
      passRate: number;
    },
  ): Promise<void> {
    const newStatus = this.evaluateProjectStatus(metrics);
    await this.projectRepository.update(
      { status: newStatus },
      { where: { id: projectId } },
    );
  }

  /**
   * Update project actualEffort and progress based on phase data
   * Called automatically when phase metrics are updated
   *
   * Progress = simple average of all phase progress (each phase has equal weight)
   */
  async updateProjectMetricsFromPhases(projectId: number): Promise<void> {
    const phases = await this.phaseService.findByProject(projectId);

    if (phases.length === 0) {
      return;
    }

    // Calculate total actual effort (sum of all phases)
    const totalActual = phases.reduce((sum, phase) => sum + (phase.actualEffort || 0), 0);

    // Calculate simple average progress (each phase has equal weight)
    // Example: 5 phases with progress [75, 0, 0, 0, 0] => (75+0+0+0+0)/5 = 15%
    const avgProgress = phases.reduce((sum, phase) => sum + (phase.progress || 0), 0) / phases.length;

    await this.projectRepository.update(
      {
        actualEffort: totalActual,
        progress: Math.round(avgProgress * 100) / 100,
      },
      { where: { id: projectId } },
    );
  }
}
