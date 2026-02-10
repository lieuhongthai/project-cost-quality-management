import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Op } from 'sequelize';
import { ScreenFunction } from './screen-function.model';
import { ScreenFunctionDefaultMember } from './screen-function-default-member.model';
import { StepScreenFunction } from '../task-workflow/step-screen-function.model';
import { Member } from '../member/member.model';
import { CreateScreenFunctionDto, UpdateScreenFunctionDto, ReorderScreenFunctionDto } from './screen-function.dto';

@Injectable()
export class ScreenFunctionService {
  constructor(
    @Inject('SCREEN_FUNCTION_REPOSITORY')
    private screenFunctionRepository: typeof ScreenFunction,
    @Inject('SCREEN_FUNCTION_DEFAULT_MEMBER_REPOSITORY')
    private defaultMemberRepository: typeof ScreenFunctionDefaultMember,
  ) {}

  async findAll(): Promise<ScreenFunction[]> {
    return this.screenFunctionRepository.findAll({
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
    });
  }

  async findByProject(projectId: number): Promise<ScreenFunction[]> {
    const screenFunctions = await this.screenFunctionRepository.findAll({
      where: { projectId },
      order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
    });

    if (screenFunctions.length === 0) return screenFunctions;

    // Get all StepScreenFunction records for these screen functions
    const sfIds = screenFunctions.map(sf => sf.id);
    const allStepScreenFunctions = await StepScreenFunction.findAll({
      where: { screenFunctionId: { [Op.in]: sfIds } },
    });

    // Group by screenFunctionId
    const ssfByScreenFunction = new Map<number, StepScreenFunction[]>();
    for (const ssf of allStepScreenFunctions) {
      const existing = ssfByScreenFunction.get(ssf.screenFunctionId) || [];
      existing.push(ssf);
      ssfByScreenFunction.set(ssf.screenFunctionId, existing);
    }

    // Update ScreenFunctions with aggregated values and save to DB
    for (const sf of screenFunctions) {
      const sfSteps = ssfByScreenFunction.get(sf.id) || [];
      if (sfSteps.length === 0) continue;

      const estimatedEffort = sfSteps.reduce((sum, s) => sum + (s.estimatedEffort || 0), 0);
      const actualEffort = sfSteps.reduce((sum, s) => sum + (s.actualEffort || 0), 0);
      const totalTasks = sfSteps.length;
      const completedTasks = sfSteps.filter(s => s.status === 'Completed').length;
      const progress = Math.round((completedTasks / totalTasks) * 100);
      const allCompleted = sfSteps.every(s => s.status === 'Completed');
      const allNotStarted = sfSteps.every(s => s.status === 'Not Started');
      const status = allCompleted ? 'Completed' : allNotStarted ? 'Not Started' : 'In Progress';

      // Update if values have changed
      if (sf.estimatedEffort !== estimatedEffort || sf.actualEffort !== actualEffort ||
          sf.progress !== progress || sf.status !== status) {
        await sf.update({ estimatedEffort, actualEffort, progress, status });
      }
    }

    return screenFunctions;
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

  // Get summary for a project - aggregates from StepScreenFunction data
  async getProjectSummary(projectId: number) {
    const screenFunctions = await this.findByProject(projectId);

    if (screenFunctions.length === 0) {
      return {
        total: 0,
        totalEstimated: 0,
        totalActual: 0,
        avgProgress: 0,
        variance: 0,
        variancePercentage: 0,
        byType: { Screen: 0, Function: 0, Other: 0 },
        byStatus: { 'Not Started': 0, 'In Progress': 0, 'Completed': 0 },
        byPriority: { High: 0, Medium: 0, Low: 0 },
      };
    }

    const sfIds = screenFunctions.map(sf => sf.id);

    // Get all StepScreenFunction records for these screen functions
    const allStepScreenFunctions = await StepScreenFunction.findAll({
      where: { screenFunctionId: { [Op.in]: sfIds } },
    });

    // Group StepScreenFunctions by screenFunctionId
    const ssfByScreenFunction = new Map<number, StepScreenFunction[]>();
    for (const ssf of allStepScreenFunctions) {
      const existing = ssfByScreenFunction.get(ssf.screenFunctionId) || [];
      existing.push(ssf);
      ssfByScreenFunction.set(ssf.screenFunctionId, existing);
    }

    // Compute aggregated values per ScreenFunction
    const aggregated = screenFunctions.map(sf => {
      const sfSteps = ssfByScreenFunction.get(sf.id) || [];

      if (sfSteps.length === 0) {
        // No StepScreenFunctions linked - use the ScreenFunction's own values
        return {
          ...sf.toJSON(),
          estimatedEffort: sf.estimatedEffort || 0,
          actualEffort: sf.actualEffort || 0,
          progress: sf.progress || 0,
          status: sf.status || 'Not Started',
        };
      }

      // Aggregate from StepScreenFunctions
      const estimatedEffort = sfSteps.reduce((sum, s) => sum + (s.estimatedEffort || 0), 0);
      const actualEffort = sfSteps.reduce((sum, s) => sum + (s.actualEffort || 0), 0);

      const totalTasks = sfSteps.length;
      const completedTasks = sfSteps.filter(s => s.status === 'Completed').length;
      const progress = Math.round((completedTasks / totalTasks) * 100);

      const allCompleted = sfSteps.every(s => s.status === 'Completed');
      const allNotStarted = sfSteps.every(s => s.status === 'Not Started');
      const status = allCompleted ? 'Completed' : allNotStarted ? 'Not Started' : 'In Progress';

      return {
        ...sf.toJSON(),
        estimatedEffort,
        actualEffort,
        progress,
        status,
      };
    });

    const totalEstimated = aggregated.reduce((sum, sf) => sum + sf.estimatedEffort, 0);
    const totalActual = aggregated.reduce((sum, sf) => sum + sf.actualEffort, 0);
    const avgProgress = aggregated.reduce((sum, sf) => sum + sf.progress, 0) / aggregated.length;

    const byType = {
      Screen: screenFunctions.filter(sf => sf.type === 'Screen').length,
      Function: screenFunctions.filter(sf => sf.type === 'Function').length,
      Other: screenFunctions.filter(sf => sf.type === 'Other').length,
    };

    const byStatus = {
      'Not Started': aggregated.filter(sf => sf.status === 'Not Started').length,
      'In Progress': aggregated.filter(sf => sf.status === 'In Progress').length,
      'Completed': aggregated.filter(sf => sf.status === 'Completed').length,
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

  // ===== Default Member Methods =====

  async getDefaultMembers(screenFunctionId: number): Promise<ScreenFunctionDefaultMember[]> {
    return this.defaultMemberRepository.findAll({
      where: { screenFunctionId },
      include: [{ model: Member, as: 'member' }],
    });
  }

  async getDefaultMembersByProject(projectId: number): Promise<ScreenFunctionDefaultMember[]> {
    const screenFunctions = await this.screenFunctionRepository.findAll({
      where: { projectId },
      attributes: ['id'],
    });
    const sfIds = screenFunctions.map(sf => sf.id);
    if (sfIds.length === 0) return [];

    return this.defaultMemberRepository.findAll({
      where: { screenFunctionId: { [Op.in]: sfIds } },
      include: [{ model: Member, as: 'member' }],
    });
  }

  async addDefaultMember(screenFunctionId: number, memberId: number): Promise<ScreenFunctionDefaultMember> {
    const existing = await this.defaultMemberRepository.findOne({
      where: { screenFunctionId, memberId },
    });
    if (existing) return existing;

    return this.defaultMemberRepository.create({
      screenFunctionId,
      memberId,
    } as any);
  }

  async removeDefaultMember(screenFunctionId: number, memberId: number): Promise<void> {
    await this.defaultMemberRepository.destroy({
      where: { screenFunctionId, memberId },
    });
  }

  async setDefaultMembers(screenFunctionId: number, memberIds: number[]): Promise<ScreenFunctionDefaultMember[]> {
    // Remove all existing default members
    await this.defaultMemberRepository.destroy({
      where: { screenFunctionId },
    });

    if (memberIds.length === 0) return [];

    // Create new default members
    const items = memberIds.map(memberId => ({
      screenFunctionId,
      memberId,
    }));
    await this.defaultMemberRepository.bulkCreate(items as any[]);

    return this.getDefaultMembers(screenFunctionId);
  }
}
