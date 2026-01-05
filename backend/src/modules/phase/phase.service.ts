import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Phase } from './phase.model';
import { CreatePhaseDto, UpdatePhaseDto } from './phase.dto';

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
    return this.phaseRepository.create(createPhaseDto as any);
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
}
