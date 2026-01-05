import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Project } from './project.model';
import { ProjectSettings } from './project-settings.model';
import { CreateProjectDto, UpdateProjectDto, CreateProjectSettingsDto, UpdateProjectSettingsDto } from './project.dto';
import { EVALUATION_THRESHOLDS, getWorstStatus } from '../../config/evaluation-thresholds';

@Injectable()
export class ProjectService {
  constructor(
    @Inject('PROJECT_REPOSITORY')
    private projectRepository: typeof Project,
    @Inject('PROJECT_SETTINGS_REPOSITORY')
    private projectSettingsRepository: typeof ProjectSettings,
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
    return this.projectRepository.create(createProjectDto as any);
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
    const settings = await this.projectSettingsRepository.findOne({
      where: { projectId },
    });

    if (!settings) {
      throw new NotFoundException(`Settings for project ${projectId} not found`);
    }

    await settings.update(updateSettingsDto);
    return settings;
  }

  async getSettings(projectId: number): Promise<ProjectSettings> {
    const settings = await this.projectSettingsRepository.findOne({
      where: { projectId },
    });

    if (!settings) {
      throw new NotFoundException(`Settings for project ${projectId} not found`);
    }

    return settings;
  }

  /**
   * Evaluate project status based on metrics
   * Returns: 'Good' | 'Warning' | 'At Risk'
   */
  evaluateProjectStatus(metrics: {
    schedulePerformanceIndex: number;  // SPI
    costPerformanceIndex: number;      // CPI
    delayRate: number;                 // %
    passRate: number;                  // %
  }): 'Good' | 'Warning' | 'At Risk' {
    const { schedulePerformanceIndex: spi, costPerformanceIndex: cpi, delayRate, passRate } = metrics;
    const thresholds = EVALUATION_THRESHOLDS.project;

    // Check for At Risk conditions (highest priority)
    if (
      spi < thresholds.atRisk.spi.max ||
      cpi < thresholds.atRisk.cpi.max ||
      delayRate > thresholds.atRisk.delayRate.min ||
      passRate < thresholds.atRisk.passRate.max
    ) {
      return 'At Risk';
    }

    // Check for Warning conditions
    if (
      (spi >= thresholds.warning.spi.min && spi < thresholds.warning.spi.max) ||
      (cpi >= thresholds.warning.cpi.min && cpi < thresholds.warning.cpi.max) ||
      (delayRate >= thresholds.warning.delayRate.min && delayRate <= thresholds.warning.delayRate.max) ||
      (passRate >= thresholds.warning.passRate.min && passRate < thresholds.warning.passRate.max)
    ) {
      return 'Warning';
    }

    // Default to Good
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
}
