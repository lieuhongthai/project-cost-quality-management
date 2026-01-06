import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Phase } from './phase.model';
import { CreatePhaseDto, UpdatePhaseDto, ReorderPhasesDto } from './phase.dto';
import { EVALUATION_THRESHOLDS } from '../../config/evaluation-thresholds';
import { EffortService } from '../effort/effort.service';
import { ProjectService } from '../project/project.service';

@Injectable()
export class PhaseService {
  constructor(
    @Inject('PHASE_REPOSITORY')
    private phaseRepository: typeof Phase,
    @Inject(forwardRef(() => EffortService))
    private effortService: EffortService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
  ) {}

  async findAll(): Promise<Phase[]> {
    return this.phaseRepository.findAll();
  }

  async findByProject(projectId: number): Promise<Phase[]> {
    return this.phaseRepository.findAll({
      where: { projectId },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async findOne(id: number): Promise<Phase> {
    const phase = await this.phaseRepository.findByPk(id);

    if (!phase) {
      throw new NotFoundException(`Phase with ID ${id} not found`);
    }

    return phase;
  }

  async create(createPhaseDto: CreatePhaseDto): Promise<Phase> {
    // Get the max display order for this project
    const phases = await this.findByProject(createPhaseDto.projectId);
    const maxOrder = phases.length > 0
      ? Math.max(...phases.map(p => p.displayOrder || 0))
      : 0;

    return this.phaseRepository.create({
      ...createPhaseDto,
      displayOrder: maxOrder + 1,
    } as any);
  }

  async update(id: number, updatePhaseDto: UpdatePhaseDto): Promise<Phase> {
    const phase = await this.findOne(id);
    await phase.update(updatePhaseDto);
    return phase;
  }

  async remove(id: number): Promise<void> {
    const phase = await this.findOne(id);
    await phase.destroy();
  }

  /**
   * Evaluate phase status based on metrics
   * Returns: 'Good' | 'Warning' | 'At Risk'
   *
   * Phase status uses the same thresholds as project status
   * since each phase is essentially a mini-project
   */
  evaluatePhaseStatus(metrics: {
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
   * Update phase status based on current metrics
   */
  async updatePhaseStatus(
    phaseId: number,
    metrics: {
      schedulePerformanceIndex: number;
      costPerformanceIndex: number;
      delayRate: number;
      passRate: number;
    },
  ): Promise<void> {
    const newStatus = this.evaluatePhaseStatus(metrics);
    await this.phaseRepository.update(
      { status: newStatus },
      { where: { id: phaseId } },
    );
  }

  /**
   * Update phase actualEffort and progress based on effort data
   * Called automatically when effort records are created/updated
   */
  async updatePhaseMetricsFromEfforts(phaseId: number): Promise<void> {
    const phase = await this.findOne(phaseId);
    const effortSummary = await this.effortService.getPhaseEffortSummary(phaseId);

    await this.phaseRepository.update(
      {
        actualEffort: effortSummary.totalActual,
        progress: effortSummary.avgProgress,
      },
      { where: { id: phaseId } },
    );

    // Auto-update project metrics after updating phase
    await this.projectService.updateProjectMetricsFromPhases(phase.projectId);
  }

  /**
   * Reorder phases for a project
   */
  async reorderPhases(reorderDto: ReorderPhasesDto): Promise<void> {
    // Update each phase's displayOrder
    for (const { id, displayOrder } of reorderDto.phaseOrders) {
      await this.phaseRepository.update(
        { displayOrder },
        { where: { id } },
      );
    }
  }
}
