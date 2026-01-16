import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { PhaseScreenFunction } from './phase-screen-function.model';
import { ScreenFunction } from './screen-function.model';
import { Phase } from '../phase/phase.model';
import { Member } from '../member/member.model';
import {
  CreatePhaseScreenFunctionDto,
  UpdatePhaseScreenFunctionDto,
  BulkCreatePhaseScreenFunctionDto,
  BulkUpdatePhaseScreenFunctionDto,
} from './phase-screen-function.dto';
import { ScreenFunctionService } from './screen-function.service';
import { PhaseService } from '../phase/phase.service';

@Injectable()
export class PhaseScreenFunctionService {
  constructor(
    @Inject('PHASE_SCREEN_FUNCTION_REPOSITORY')
    private phaseScreenFunctionRepository: typeof PhaseScreenFunction,
    @Inject(forwardRef(() => ScreenFunctionService))
    private screenFunctionService: ScreenFunctionService,
    @Inject(forwardRef(() => PhaseService))
    private phaseService: PhaseService,
  ) {}

  async findAll(): Promise<PhaseScreenFunction[]> {
    return this.phaseScreenFunctionRepository.findAll({
      include: [
        { model: Phase, as: 'phase' },
        { model: ScreenFunction, as: 'screenFunction' },
        { model: Member, as: 'assignee' },
      ],
    });
  }

  async findByPhase(phaseId: number): Promise<PhaseScreenFunction[]> {
    return this.phaseScreenFunctionRepository.findAll({
      where: { phaseId },
      include: [
        { model: ScreenFunction, as: 'screenFunction' },
        { model: Member, as: 'assignee' },
      ],
      order: [[{ model: ScreenFunction, as: 'screenFunction' }, 'displayOrder', 'ASC']],
    });
  }

  async findByScreenFunction(screenFunctionId: number): Promise<PhaseScreenFunction[]> {
    return this.phaseScreenFunctionRepository.findAll({
      where: { screenFunctionId },
      include: [
        { model: Phase, as: 'phase' },
        { model: Member, as: 'assignee' },
      ],
      order: [[{ model: Phase, as: 'phase' }, 'displayOrder', 'ASC']],
    });
  }

  async findOne(id: number): Promise<PhaseScreenFunction> {
    const phaseScreenFunction = await this.phaseScreenFunctionRepository.findByPk(id, {
      include: [
        { model: Phase, as: 'phase' },
        { model: ScreenFunction, as: 'screenFunction' },
        { model: Member, as: 'assignee' },
      ],
    });

    if (!phaseScreenFunction) {
      throw new NotFoundException(`PhaseScreenFunction with ID ${id} not found`);
    }

    return phaseScreenFunction;
  }

  async findByPhaseAndScreenFunction(phaseId: number, screenFunctionId: number): Promise<PhaseScreenFunction | null> {
    return this.phaseScreenFunctionRepository.findOne({
      where: { phaseId, screenFunctionId },
    });
  }

  async create(createDto: CreatePhaseScreenFunctionDto): Promise<PhaseScreenFunction> {
    // Check if link already exists
    const existing = await this.findByPhaseAndScreenFunction(createDto.phaseId, createDto.screenFunctionId);
    if (existing) {
      throw new BadRequestException('This Screen/Function is already linked to this phase');
    }

    const phaseScreenFunction = await this.phaseScreenFunctionRepository.create(createDto as any);

    // Update parent ScreenFunction metrics
    await this.screenFunctionService.updateScreenFunctionMetrics(createDto.screenFunctionId);

    // Update parent Phase metrics
    await this.updatePhaseMetrics(createDto.phaseId);

    return this.findOne(phaseScreenFunction.id);
  }

  async update(id: number, updateDto: UpdatePhaseScreenFunctionDto): Promise<PhaseScreenFunction> {
    const phaseScreenFunction = await this.findOne(id);

    // Auto-calculate progress if actualEffort is updated
    if (updateDto.actualEffort !== undefined && phaseScreenFunction.estimatedEffort > 0) {
      const newActual = updateDto.actualEffort;
      const estimated = updateDto.estimatedEffort ?? phaseScreenFunction.estimatedEffort;
      if (estimated > 0 && updateDto.progress === undefined) {
        updateDto.progress = Math.min(100, Math.round((newActual / estimated) * 10000) / 100);
      }
    }

    // Auto-update status based on progress
    if (updateDto.progress !== undefined && updateDto.status === undefined) {
      if (updateDto.progress >= 100) {
        updateDto.status = 'Completed';
      } else if (updateDto.progress > 0) {
        updateDto.status = 'In Progress';
      }
    }

    await phaseScreenFunction.update(updateDto);

    // Update parent ScreenFunction metrics
    await this.screenFunctionService.updateScreenFunctionMetrics(phaseScreenFunction.screenFunctionId);

    // Update parent Phase metrics
    await this.updatePhaseMetrics(phaseScreenFunction.phaseId);

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const phaseScreenFunction = await this.findOne(id);
    const screenFunctionId = phaseScreenFunction.screenFunctionId;
    const phaseId = phaseScreenFunction.phaseId;

    await phaseScreenFunction.destroy();

    // Update parent ScreenFunction metrics
    await this.screenFunctionService.updateScreenFunctionMetrics(screenFunctionId);

    // Update parent Phase metrics
    await this.updatePhaseMetrics(phaseId);
  }

  async bulkCreate(bulkDto: BulkCreatePhaseScreenFunctionDto): Promise<PhaseScreenFunction[]> {
    const results: PhaseScreenFunction[] = [];
    const screenFunctionIds = new Set<number>();

    for (const item of bulkDto.items) {
      // Check if already exists
      const existing = await this.findByPhaseAndScreenFunction(bulkDto.phaseId, item.screenFunctionId);
      if (!existing) {
        const created = await this.phaseScreenFunctionRepository.create({
          phaseId: bulkDto.phaseId,
          screenFunctionId: item.screenFunctionId,
          estimatedEffort: item.estimatedEffort || 0,
          note: item.note,
        } as any);
        results.push(created);
        screenFunctionIds.add(item.screenFunctionId);
      }
    }

    // Update metrics for all affected screen functions
    for (const sfId of screenFunctionIds) {
      await this.screenFunctionService.updateScreenFunctionMetrics(sfId);
    }

    // Update parent Phase metrics (all items belong to same phase)
    if (results.length > 0) {
      await this.updatePhaseMetrics(bulkDto.phaseId);
    }

    return results;
  }

  async bulkUpdate(bulkDto: BulkUpdatePhaseScreenFunctionDto): Promise<PhaseScreenFunction[]> {
    const results: PhaseScreenFunction[] = [];
    const screenFunctionIds = new Set<number>();
    const phaseIds = new Set<number>();

    for (const item of bulkDto.items) {
      const psf = await this.findOne(item.id);
      screenFunctionIds.add(psf.screenFunctionId);
      phaseIds.add(psf.phaseId);

      const updateData: any = {};
      if (item.estimatedEffort !== undefined) updateData.estimatedEffort = item.estimatedEffort;
      if (item.actualEffort !== undefined) updateData.actualEffort = item.actualEffort;
      if (item.progress !== undefined) updateData.progress = item.progress;
      if (item.status !== undefined) updateData.status = item.status;
      if (item.note !== undefined) updateData.note = item.note;
      if (item.assigneeId !== undefined) updateData.assigneeId = item.assigneeId;

      await psf.update(updateData);
      results.push(psf);
    }

    // Update metrics for all affected screen functions
    for (const sfId of screenFunctionIds) {
      await this.screenFunctionService.updateScreenFunctionMetrics(sfId);
    }

    // Update metrics for all affected phases
    for (const phaseId of phaseIds) {
      await this.updatePhaseMetrics(phaseId);
    }

    return results;
  }

  // Get summary for a phase
  async getPhaseSummary(phaseId: number) {
    const links = await this.findByPhase(phaseId);

    const totalEstimated = links.reduce((sum, l) => sum + (l.estimatedEffort || 0), 0);
    const totalActual = links.reduce((sum, l) => sum + (l.actualEffort || 0), 0);
    const avgProgress = links.length > 0
      ? links.reduce((sum, l) => sum + (l.progress || 0), 0) / links.length
      : 0;

    const byStatus = {
      'Not Started': links.filter(l => l.status === 'Not Started').length,
      'In Progress': links.filter(l => l.status === 'In Progress').length,
      'Completed': links.filter(l => l.status === 'Completed').length,
      'Skipped': links.filter(l => l.status === 'Skipped').length,
    };

    return {
      total: links.length,
      totalEstimated,
      totalActual,
      avgProgress: Math.round(avgProgress * 100) / 100,
      variance: totalActual - totalEstimated,
      variancePercentage: totalEstimated > 0 ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 10000) / 100 : 0,
      byStatus,
    };
  }

  // Get all screen functions for a project with their phase links
  async getProjectScreenFunctionsWithPhases(projectId: number) {
    const screenFunctions = await this.screenFunctionService.findByProject(projectId);

    const result = await Promise.all(
      screenFunctions.map(async (sf) => {
        const phaseLinks = await this.findByScreenFunction(sf.id);
        return {
          ...sf.toJSON(),
          phaseLinks: phaseLinks.map(pl => pl.toJSON()),
        };
      }),
    );

    return result;
  }

  /**
   * Update phase metrics (actualEffort, progress) from PhaseScreenFunction data
   * Called after any change to PhaseScreenFunction items
   */
  async updatePhaseMetrics(phaseId: number): Promise<void> {
    const summary = await this.getPhaseSummary(phaseId);

    // Update phase with the aggregated metrics
    await this.phaseService.updatePhaseMetricsFromScreenFunctions(
      phaseId,
      summary.totalActual,
      summary.avgProgress,
    );
  }
}
