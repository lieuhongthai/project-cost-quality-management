import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ScreenFunction } from './screen-function.model';
import { CreateScreenFunctionDto, UpdateScreenFunctionDto, ReorderScreenFunctionDto } from './screen-function.dto';

@Injectable()
export class ScreenFunctionService {
  constructor(
    @Inject('SCREEN_FUNCTION_REPOSITORY')
    private screenFunctionRepository: typeof ScreenFunction,
  ) {}

  async findAll(): Promise<ScreenFunction[]> {
    return this.screenFunctionRepository.findAll({
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
    });
  }

  async findByProject(projectId: number): Promise<ScreenFunction[]> {
    return this.screenFunctionRepository.findAll({
      where: { projectId },
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
    });
  }

  async findOne(id: number): Promise<ScreenFunction> {
    const screenFunction = await this.screenFunctionRepository.findByPk(id);

    if (!screenFunction) {
      throw new NotFoundException(`ScreenFunction with ID ${id} not found`);
    }

    return screenFunction;
  }

  async create(createDto: CreateScreenFunctionDto): Promise<ScreenFunction> {
    // Get max displayOrder for the project
    const maxOrder = await this.screenFunctionRepository.max('displayOrder', {
      where: { projectId: createDto.projectId },
    }) as number || 0;

    const data = {
      ...createDto,
      displayOrder: createDto.displayOrder ?? maxOrder + 1,
    };

    return this.screenFunctionRepository.create(data as any);
  }

  async update(id: number, updateDto: UpdateScreenFunctionDto): Promise<ScreenFunction> {
    const screenFunction = await this.findOne(id);
    await screenFunction.update(updateDto);

    return screenFunction;
  }

  async remove(id: number): Promise<void> {
    const screenFunction = await this.findOne(id);

    await screenFunction.destroy();
  }

  async reorder(reorderDto: ReorderScreenFunctionDto): Promise<void> {
    for (const item of reorderDto.items) {
      await this.screenFunctionRepository.update(
        { displayOrder: item.displayOrder },
        { where: { id: item.id } },
      );
    }
  }

  // Get summary for a project
  async getProjectSummary(projectId: number) {
    const screenFunctions = await this.findByProject(projectId);

    const totalEstimated = screenFunctions.reduce((sum, sf) => sum + (sf.estimatedEffort || 0), 0);
    const totalActual = screenFunctions.reduce((sum, sf) => sum + (sf.actualEffort || 0), 0);
    const avgProgress = screenFunctions.length > 0
      ? screenFunctions.reduce((sum, sf) => sum + (sf.progress || 0), 0) / screenFunctions.length
      : 0;

    const byType = {
      Screen: screenFunctions.filter(sf => sf.type === 'Screen').length,
      Function: screenFunctions.filter(sf => sf.type === 'Function').length,
    };

    const byStatus = {
      'Not Started': screenFunctions.filter(sf => sf.status === 'Not Started').length,
      'In Progress': screenFunctions.filter(sf => sf.status === 'In Progress').length,
      'Completed': screenFunctions.filter(sf => sf.status === 'Completed').length,
    };

    const byPriority = {
      High: screenFunctions.filter(sf => sf.priority === 'High').length,
      Medium: screenFunctions.filter(sf => sf.priority === 'Medium').length,
      Low: screenFunctions.filter(sf => sf.priority === 'Low').length,
    };

    return {
      total: screenFunctions.length,
      totalEstimated,
      totalActual,
      avgProgress: Math.round(avgProgress * 100) / 100,
      variance: totalActual - totalEstimated,
      variancePercentage: totalEstimated > 0 ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 10000) / 100 : 0,
      byType,
      byStatus,
      byPriority,
    };
  }
}
