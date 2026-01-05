import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Effort } from './effort.model';
import { CreateEffortDto, UpdateEffortDto, BulkEffortDto } from './effort.dto';
import { PhaseService } from '../phase/phase.service';

@Injectable()
export class EffortService {
  constructor(
    @Inject('EFFORT_REPOSITORY')
    private effortRepository: typeof Effort,
    @Inject(forwardRef(() => PhaseService))
    private phaseService: PhaseService,
  ) {}

  async findAll(): Promise<Effort[]> {
    return this.effortRepository.findAll();
  }

  async findByPhase(phaseId: number): Promise<Effort[]> {
    return this.effortRepository.findAll({
      where: { phaseId },
      order: [['year', 'ASC'], ['weekNumber', 'ASC']],
    });
  }

  async findByWeek(phaseId: number, year: number, weekNumber: number): Promise<Effort> {
    return this.effortRepository.findOne({
      where: { phaseId, year, weekNumber },
    });
  }

  async findOne(id: number): Promise<Effort> {
    const effort = await this.effortRepository.findByPk(id);

    if (!effort) {
      throw new NotFoundException(`Effort with ID ${id} not found`);
    }

    return effort;
  }

  async create(createEffortDto: CreateEffortDto): Promise<Effort> {
    const effort = await this.effortRepository.create(createEffortDto as any);

    // Auto-update phase metrics after creating effort
    await this.phaseService.updatePhaseMetricsFromEfforts(createEffortDto.phaseId);

    return effort;
  }

  async bulkCreate(bulkEffortDto: BulkEffortDto): Promise<Effort[]> {
    const efforts = await this.effortRepository.bulkCreate(
      bulkEffortDto.efforts as any[],
      { returning: true }
    );
    return efforts;
  }

  async update(id: number, updateEffortDto: UpdateEffortDto): Promise<Effort> {
    const effort = await this.findOne(id);
    await effort.update(updateEffortDto);

    // Auto-update phase metrics after updating effort
    await this.phaseService.updatePhaseMetricsFromEfforts(effort.phaseId);

    return effort;
  }

  async remove(id: number): Promise<void> {
    const effort = await this.findOne(id);
    const phaseId = effort.phaseId;
    await effort.destroy();

    // Auto-update phase metrics after deleting effort
    await this.phaseService.updatePhaseMetricsFromEfforts(phaseId);
  }

  async getPhaseEffortSummary(phaseId: number) {
    const efforts = await this.findByPhase(phaseId);
    
    const totalPlanned = efforts.reduce((sum, e) => sum + e.plannedEffort, 0);
    const totalActual = efforts.reduce((sum, e) => sum + e.actualEffort, 0);
    const avgProgress = efforts.length > 0 
      ? efforts.reduce((sum, e) => sum + e.progress, 0) / efforts.length 
      : 0;

    return {
      totalPlanned,
      totalActual,
      avgProgress,
      variance: totalActual - totalPlanned,
      variancePercentage: totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0,
    };
  }
}
