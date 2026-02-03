import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Effort } from './effort.model';
import { CreateEffortDto, UpdateEffortDto, BulkEffortDto } from './effort.dto';

@Injectable()
export class EffortService {
  constructor(
    @Inject('EFFORT_REPOSITORY')
    private effortRepository: typeof Effort,
  ) {}

  async findAll(): Promise<Effort[]> {
    return this.effortRepository.findAll();
  }

  async findByStage(stageId: number): Promise<Effort[]> {
    return this.effortRepository.findAll({
      where: { stageId },
      order: [['year', 'ASC'], ['weekNumber', 'ASC']],
    });
  }

  async findByWeek(stageId: number, year: number, weekNumber: number): Promise<Effort> {
    return this.effortRepository.findOne({
      where: { stageId, year, weekNumber },
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
    return this.effortRepository.create(createEffortDto as any);
  }

  async bulkCreate(bulkEffortDto: BulkEffortDto): Promise<Effort[]> {
    const efforts = await this.effortRepository.bulkCreate(
      bulkEffortDto.efforts.map((effort) => ({
        ...effort,
        stageId: effort.stageId ?? bulkEffortDto.stageId,
      })) as any[],
      { returning: true }
    );
    return efforts;
  }

  async update(id: number, updateEffortDto: UpdateEffortDto): Promise<Effort> {
    const effort = await this.findOne(id);
    await effort.update(updateEffortDto);
    return effort;
  }

  async remove(id: number): Promise<void> {
    const effort = await this.findOne(id);
    await effort.destroy();
  }

  async getStageEffortSummary(stageId: number) {
    const efforts = await this.findByStage(stageId);
    
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
