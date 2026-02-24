import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Project } from './project.model';
import { ProjectSettings, DEFAULT_NON_WORKING_DAYS } from './project-settings.model';
import { CreateProjectDto, UpdateProjectDto, CreateProjectSettingsDto, UpdateProjectSettingsDto } from './project.dto';
import { WorkflowStage } from '../task-workflow/workflow-stage.model';
import { TaskWorkflowService } from '../task-workflow/task-workflow.service';
import { MemberService } from '../member/member.service';
import { ScreenFunctionService } from '../screen-function/screen-function.service';

@Injectable()
export class ProjectService {
  constructor(
    @Inject('PROJECT_REPOSITORY')
    private projectRepository: typeof Project,
    @Inject('PROJECT_SETTINGS_REPOSITORY')
    private projectSettingsRepository: typeof ProjectSettings,
    @Inject(forwardRef(() => TaskWorkflowService))
    private taskWorkflowService: TaskWorkflowService,
    @Inject(forwardRef(() => MemberService))
    private memberService: MemberService,
    @Inject(forwardRef(() => ScreenFunctionService))
    private screenFunctionService: ScreenFunctionService,
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

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    // Create the project
    const project = await this.projectRepository.create(createProjectDto as any);

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

    // Auto-initialize workflow stages and steps
    try {
      await this.taskWorkflowService.initializeProjectWorkflow({ projectId: project.id });
    } catch (error) {
      // Non-critical: project is still usable without auto-initialized workflow
      console.warn(`Auto-init workflow failed for project ${project.id}:`, error?.message);
    }

    return project;
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
  }): 'Good' | 'Warning' | 'At Risk' {
    const { costPerformanceIndex: cpi } = metrics;

    // CPI = Earned Value / Actual Cost = (Estimated × Progress) / Actual
    // CPI >= 1.0 means on or under budget (Good)
    // CPI 0.83-1.0 means slightly over budget (Warning) - equivalent to 100-120% actual
    // CPI < 0.83 means significantly over budget (At Risk) - equivalent to >120% actual

    // At Risk: CPI < 0.83 (>20% over budget) OR serious quality issues
    if (cpi < 0.83) {
      return 'At Risk';
    }

    // Warning: CPI 0.83-1.0 (slightly over budget) OR minor quality concerns
    if (cpi < 1.0) {
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
    },
  ): Promise<void> {
    const newStatus = this.evaluateProjectStatus(metrics);
    await this.projectRepository.update(
      { status: newStatus },
      { where: { id: projectId } },
    );
  }

  /**
   * Update project actualEffort and progress based on stage data
   * Called automatically when stage metrics are updated
   *
   * Progress = simple average of all stage progress (each stage has equal weight)
   */
  async updateProjectMetricsFromStages(projectId: number): Promise<void> {
    const stages = await WorkflowStage.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    if (stages.length === 0) {
      return;
    }

    // Calculate total actual effort from stages (stored in man-hours)
    const totalActualHours = stages.reduce((sum, stage) => sum + (stage.actualEffort || 0), 0);

    const settings = await this.projectSettingsRepository.findOne({
      where: { projectId },
    });
    const hoursPerDay = settings?.workingHoursPerDay || 8;
    const daysPerMonth = settings?.workingDaysPerMonth || 20;
    const hoursPerMonth = hoursPerDay * daysPerMonth;

    // Project actualEffort is stored in man-months
    const totalActual = hoursPerMonth > 0 ? totalActualHours / hoursPerMonth : 0;

    // Calculate simple average progress (each stage has equal weight)
    // Example: 5 stages with progress [75, 0, 0, 0, 0] => (75+0+0+0+0)/5 = 15%
    const avgProgress = stages.reduce((sum, stage) => sum + (stage.progress || 0), 0) / stages.length;

    await this.projectRepository.update(
      {
        actualEffort: totalActual,
        progress: Math.round(avgProgress * 100) / 100,
      },
      { where: { id: projectId } },
    );
  }

  /**
   * Quick setup for a project: create members, screen functions, and update settings in one call.
   * Used by the AI Plan Everything dialog to resolve missing prerequisites inline.
   */
  async quickSetup(projectId: number, body: {
    settings?: UpdateProjectSettingsDto;
    members?: Array<{ name: string; role: string; email?: string; skills?: string[]; hourlyRate?: number; yearsOfExperience?: number }>;
    screenFunctions?: Array<{ name: string; type?: string; complexity?: string; priority?: string; description?: string }>;
  }) {
    const results: { settingsUpdated: boolean; membersCreated: number; screenFunctionsCreated: number } = {
      settingsUpdated: false,
      membersCreated: 0,
      screenFunctionsCreated: 0,
    };

    // 1. Update settings if provided
    if (body.settings) {
      await this.updateSettings(projectId, body.settings);
      results.settingsUpdated = true;
    }

    // 2. Create members with smart defaults
    if (body.members && body.members.length > 0) {
      const ROLE_SKILLS_MAP: Record<string, string[]> = {
        PM: ['project-management', 'planning', 'communication'],
        TL: ['technical-leadership', 'code-review', 'architecture'],
        BA: ['requirements-analysis', 'documentation', 'communication'],
        DEV: ['coding', 'code-review', 'unit-testing'],
        QA: ['testing', 'test-case-design', 'bug-reporting'],
        Comtor: ['translation', 'communication'],
        Designer: ['ui-design', 'ux-design', 'prototyping'],
        DevOps: ['ci-cd', 'infrastructure', 'monitoring'],
      };

      for (const member of body.members) {
        const skills = member.skills?.length ? member.skills : (ROLE_SKILLS_MAP[member.role] || []);
        await this.memberService.create({
          projectId,
          name: member.name,
          role: member.role as any,
          email: member.email,
          skills,
          hourlyRate: member.hourlyRate || 0,
          yearsOfExperience: member.yearsOfExperience,
        } as any);
        results.membersCreated++;
      }
    }

    // 3. Create screen functions (auto-link handled by screen-function.service)
    if (body.screenFunctions && body.screenFunctions.length > 0) {
      for (const sf of body.screenFunctions) {
        await this.screenFunctionService.create({
          projectId,
          name: sf.name,
          type: (sf.type as any) || 'Screen',
          complexity: (sf.complexity as any) || 'Medium',
          priority: (sf.priority as any) || 'Medium',
          description: sf.description,
        } as any);
        results.screenFunctionsCreated++;
      }
    }

    return { success: true, ...results };
  }
}
