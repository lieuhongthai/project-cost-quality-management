import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Phase } from './phase.model';
import { CreatePhaseDto, UpdatePhaseDto, ReorderPhasesDto } from './phase.dto';
import { EVALUATION_THRESHOLDS } from '../../config/evaluation-thresholds';

@Injectable()
export class PhaseService {
  constructor(
    @Inject('PHASE_REPOSITORY')
    private phaseRepository: typeof Phase,
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

  async remove(id: number): Promise<{ deletedLinkedItems: number }> {
    const phase = await this.findOne(id);
    const projectId = phase.projectId;

    // Get count of linked items before deletion (for informational purposes)
    const stats = await this.getPhaseStats(id);

    // Destroy the phase (cascades to PhaseScreenFunctions via foreign key)
    await phase.destroy();

    return { deletedLinkedItems: stats.linkedScreenFunctions };
  }

  /**
   * Get phase statistics for deletion warnings
   */
  async getPhaseStats(phaseId: number): Promise<{
    linkedScreenFunctions: number;
    totalActualEffort: number;
    hasData: boolean;
  }> {
    const phase = await this.findOne(phaseId);

    // Import here to avoid circular dependency issues at module load
    const { PhaseScreenFunction } = await import('../screen-function/phase-screen-function.model');

    const linkedCount = await PhaseScreenFunction.count({
      where: { phaseId },
    });

    return {
      linkedScreenFunctions: linkedCount,
      totalActualEffort: phase.actualEffort || 0,
      hasData: linkedCount > 0 || (phase.actualEffort || 0) > 0,
    };
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
   * Update phase actualEffort and progress from PhaseScreenFunction data
   * Called when PhaseScreenFunction items are updated
   *
   * @param phaseId - Phase ID
   * @param totalActualEffortHours - Total actual effort in man-hours from all linked screen/functions
   * @param avgProgress - Average progress from all linked screen/functions
   * @param workingHoursPerDay - Hours per day for conversion (default 8)
   * @param workingDaysPerMonth - Days per month for conversion (default 20)
   */
  async updatePhaseMetricsFromScreenFunctions(
    phaseId: number,
    totalActualEffortHours: number,
    avgProgress: number,
    workingHoursPerDay: number = 8,
    workingDaysPerMonth: number = 20,
  ): Promise<void> {
    const phase = await this.findOne(phaseId);

    // Convert man-hours to man-months for storage
    const hoursPerMonth = workingHoursPerDay * workingDaysPerMonth;
    const actualEffortInMonths = totalActualEffortHours / hoursPerMonth;

    await this.phaseRepository.update(
      {
        actualEffort: actualEffortInMonths,
        progress: avgProgress,
      },
      { where: { id: phaseId } },
    );

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
