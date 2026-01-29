import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { WorkflowStage, DEFAULT_WORKFLOW_STAGES } from './workflow-stage.model';
import { WorkflowStep, DEFAULT_WORKFLOW_STEPS } from './workflow-step.model';
import { TaskWorkflow } from './task-workflow.model';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { Member } from '../member/member.model';
import {
  CreateWorkflowStageDto,
  UpdateWorkflowStageDto,
  ReorderStagesDto,
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
  ReorderStepsDto,
  BulkCreateStepsDto,
  ToggleTaskWorkflowDto,
  BulkToggleTaskWorkflowDto,
  UpdateTaskWorkflowNoteDto,
  InitializeProjectWorkflowDto,
  TaskWorkflowFilterDto,
  UpdateScreenFunctionAssigneeDto,
} from './task-workflow.dto';
import { Op } from 'sequelize';

@Injectable()
export class TaskWorkflowService {
  constructor(
    @Inject('WORKFLOW_STAGE_REPOSITORY')
    private stageRepository: typeof WorkflowStage,
    @Inject('WORKFLOW_STEP_REPOSITORY')
    private stepRepository: typeof WorkflowStep,
    @Inject('TASK_WORKFLOW_REPOSITORY')
    private taskWorkflowRepository: typeof TaskWorkflow,
    @Inject('SCREEN_FUNCTION_REPOSITORY')
    private screenFunctionRepository: typeof ScreenFunction,
  ) {}

  // ===== Workflow Stage Methods =====

  async findAllStages(projectId: number): Promise<WorkflowStage[]> {
    return this.stageRepository.findAll({
      where: { projectId },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async findStageById(id: number): Promise<WorkflowStage> {
    const stage = await this.stageRepository.findByPk(id);
    if (!stage) {
      throw new NotFoundException(`Workflow stage with ID ${id} not found`);
    }
    return stage;
  }

  async createStage(dto: CreateWorkflowStageDto): Promise<WorkflowStage> {
    const stages = await this.findAllStages(dto.projectId);
    const maxOrder = stages.length > 0
      ? Math.max(...stages.map(s => s.displayOrder || 0))
      : 0;

    return this.stageRepository.create({
      ...dto,
      displayOrder: dto.displayOrder ?? maxOrder + 1,
    } as any);
  }

  async updateStage(id: number, dto: UpdateWorkflowStageDto): Promise<WorkflowStage> {
    const stage = await this.findStageById(id);
    await stage.update(dto);
    return stage;
  }

  async deleteStage(id: number): Promise<void> {
    const stage = await this.findStageById(id);
    await stage.destroy();
  }

  async reorderStages(dto: ReorderStagesDto): Promise<void> {
    for (const { id, displayOrder } of dto.stageOrders) {
      await this.stageRepository.update(
        { displayOrder },
        { where: { id } },
      );
    }
  }

  // ===== Workflow Step Methods =====

  async findAllSteps(stageId: number): Promise<WorkflowStep[]> {
    return this.stepRepository.findAll({
      where: { stageId },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async findStepById(id: number): Promise<WorkflowStep> {
    const step = await this.stepRepository.findByPk(id);
    if (!step) {
      throw new NotFoundException(`Workflow step with ID ${id} not found`);
    }
    return step;
  }

  async createStep(dto: CreateWorkflowStepDto): Promise<WorkflowStep> {
    const steps = await this.findAllSteps(dto.stageId);
    const maxOrder = steps.length > 0
      ? Math.max(...steps.map(s => s.displayOrder || 0))
      : 0;

    return this.stepRepository.create({
      ...dto,
      displayOrder: dto.displayOrder ?? maxOrder + 1,
    } as any);
  }

  async updateStep(id: number, dto: UpdateWorkflowStepDto): Promise<WorkflowStep> {
    const step = await this.findStepById(id);
    await step.update(dto);
    return step;
  }

  async deleteStep(id: number): Promise<void> {
    const step = await this.findStepById(id);
    await step.destroy();
  }

  async reorderSteps(dto: ReorderStepsDto): Promise<void> {
    for (const { id, displayOrder } of dto.stepOrders) {
      await this.stepRepository.update(
        { displayOrder },
        { where: { id } },
      );
    }
  }

  async bulkCreateSteps(dto: BulkCreateStepsDto): Promise<WorkflowStep[]> {
    const steps = await this.findAllSteps(dto.stageId);
    const maxOrder = steps.length > 0
      ? Math.max(...steps.map(s => s.displayOrder || 0))
      : 0;

    const newSteps = dto.stepNames.map((name, index) => ({
      stageId: dto.stageId,
      name,
      displayOrder: maxOrder + index + 1,
    }));

    return this.stepRepository.bulkCreate(newSteps as any[]);
  }

  // ===== Task Workflow Methods =====

  async getProjectWorkflow(projectId: number, filter?: TaskWorkflowFilterDto): Promise<{
    stages: any[];
    screenFunctions: any[];
    taskWorkflows: any[];
    progress: {
      total: number;
      completed: number;
      percentage: number;
    };
  }> {
    // Get all stages with their steps
    const stages = await this.stageRepository.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    // Get all steps for these stages
    const stageIds = stages.map(s => s.id);
    const steps = await this.stepRepository.findAll({
      where: { stageId: { [Op.in]: stageIds }, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    // Build stages with steps
    const stagesWithSteps = stages.map(stage => ({
      ...stage.toJSON(),
      steps: steps.filter(s => s.stageId === stage.id),
    }));

    // Get screen functions with optional filter
    const screenFunctionWhere: any = { projectId };
    if (filter?.screenName) {
      screenFunctionWhere.name = { [Op.iLike]: `%${filter.screenName}%` };
    }

    const screenFunctions = await this.screenFunctionRepository.findAll({
      where: screenFunctionWhere,
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });

    // Get all task workflows
    const stepIds = steps.map(s => s.id);
    const screenFunctionIds = screenFunctions.map(sf => sf.id);

    let taskWorkflowWhere: any = {
      screenFunctionId: { [Op.in]: screenFunctionIds },
      stepId: { [Op.in]: stepIds },
    };

    const taskWorkflows = await this.taskWorkflowRepository.findAll({
      where: taskWorkflowWhere,
      include: [
        { model: Member, as: 'completedByMember' },
      ],
    });

    // Filter by status if specified
    let filteredScreenFunctions = screenFunctions;
    if (filter?.status && filter.status !== 'all') {
      const sfIds = screenFunctions.map(sf => sf.id);
      const workflowMap = new Map<number, boolean>();

      for (const sfId of sfIds) {
        const sfWorkflows = taskWorkflows.filter(tw => tw.screenFunctionId === sfId);
        const totalSteps = stepIds.length;
        const completedSteps = sfWorkflows.filter(tw => tw.isCompleted).length;

        if (filter.status === 'completed') {
          workflowMap.set(sfId, completedSteps === totalSteps && totalSteps > 0);
        } else if (filter.status === 'incomplete') {
          workflowMap.set(sfId, completedSteps < totalSteps || totalSteps === 0);
        }
      }

      filteredScreenFunctions = screenFunctions.filter(sf => workflowMap.get(sf.id));
    }

    // Filter by stage if specified
    if (filter?.stageId) {
      const stageStepIds = steps.filter(s => s.stageId === filter.stageId).map(s => s.id);
      // Keep only screen functions that have incomplete steps in this stage
      const sfIdsWithIncomplete = new Set<number>();
      for (const tw of taskWorkflows) {
        if (stageStepIds.includes(tw.stepId) && !tw.isCompleted) {
          sfIdsWithIncomplete.add(tw.screenFunctionId);
        }
      }
      // Also include screen functions without any workflow records for this stage
      for (const sf of filteredScreenFunctions) {
        const hasWorkflow = taskWorkflows.some(tw =>
          tw.screenFunctionId === sf.id && stageStepIds.includes(tw.stepId)
        );
        if (!hasWorkflow) {
          sfIdsWithIncomplete.add(sf.id);
        }
      }
      filteredScreenFunctions = filteredScreenFunctions.filter(sf => sfIdsWithIncomplete.has(sf.id));
    }

    // Calculate progress
    const totalPossible = screenFunctions.length * stepIds.length;
    const completedCount = taskWorkflows.filter(tw => tw.isCompleted).length;

    return {
      stages: stagesWithSteps,
      screenFunctions: filteredScreenFunctions,
      taskWorkflows: taskWorkflows,
      progress: {
        total: totalPossible,
        completed: completedCount,
        percentage: totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0,
      },
    };
  }

  async toggleTaskWorkflow(dto: ToggleTaskWorkflowDto): Promise<TaskWorkflow> {
    const [taskWorkflow, created] = await this.taskWorkflowRepository.findOrCreate({
      where: {
        screenFunctionId: dto.screenFunctionId,
        stepId: dto.stepId,
      },
      defaults: {
        screenFunctionId: dto.screenFunctionId,
        stepId: dto.stepId,
        isCompleted: dto.isCompleted,
        completedAt: dto.isCompleted ? new Date() : null,
        completedBy: dto.completedBy,
        note: dto.note,
      } as any,
    });

    if (!created) {
      await taskWorkflow.update({
        isCompleted: dto.isCompleted,
        completedAt: dto.isCompleted ? new Date() : null,
        completedBy: dto.completedBy,
        note: dto.note ?? taskWorkflow.note,
      });
    }

    return taskWorkflow;
  }

  async bulkToggleTaskWorkflow(dto: BulkToggleTaskWorkflowDto): Promise<TaskWorkflow[]> {
    const results: TaskWorkflow[] = [];
    for (const item of dto.items) {
      const result = await this.toggleTaskWorkflow(item);
      results.push(result);
    }
    return results;
  }

  async updateTaskWorkflowNote(id: number, dto: UpdateTaskWorkflowNoteDto): Promise<TaskWorkflow> {
    const taskWorkflow = await this.taskWorkflowRepository.findByPk(id);
    if (!taskWorkflow) {
      throw new NotFoundException(`Task workflow with ID ${id} not found`);
    }
    await taskWorkflow.update(dto);
    return taskWorkflow;
  }

  // ===== Initialize Project Workflow =====

  async initializeProjectWorkflow(dto: InitializeProjectWorkflowDto): Promise<{
    stages: WorkflowStage[];
    steps: WorkflowStep[];
  }> {
    // Check if project already has workflow stages
    const existingStages = await this.findAllStages(dto.projectId);
    if (existingStages.length > 0) {
      // Return existing stages and steps
      const stageIds = existingStages.map(s => s.id);
      const existingSteps = await this.stepRepository.findAll({
        where: { stageId: { [Op.in]: stageIds } },
        order: [['displayOrder', 'ASC']],
      });
      return { stages: existingStages, steps: existingSteps };
    }

    // Create default stages
    const stages: WorkflowStage[] = [];
    const steps: WorkflowStep[] = [];

    for (const stageTemplate of DEFAULT_WORKFLOW_STAGES) {
      const stage = await this.stageRepository.create({
        projectId: dto.projectId,
        name: stageTemplate.name,
        displayOrder: stageTemplate.displayOrder,
        isActive: true,
      } as any);
      stages.push(stage);

      // Create default steps for this stage
      const stageSteps = DEFAULT_WORKFLOW_STEPS[stageTemplate.name] || [];
      for (let i = 0; i < stageSteps.length; i++) {
        const step = await this.stepRepository.create({
          stageId: stage.id,
          name: stageSteps[i],
          displayOrder: i + 1,
          isActive: true,
        } as any);
        steps.push(step);
      }
    }

    return { stages, steps };
  }

  // ===== Progress Calculation =====

  async getScreenFunctionProgress(screenFunctionId: number): Promise<{
    total: number;
    completed: number;
    percentage: number;
  }> {
    // Get the screen function to find its project
    const screenFunction = await this.screenFunctionRepository.findByPk(screenFunctionId);
    if (!screenFunction) {
      throw new NotFoundException(`Screen function with ID ${screenFunctionId} not found`);
    }

    // Get all active steps for this project
    const stages = await this.stageRepository.findAll({
      where: { projectId: screenFunction.projectId, isActive: true },
    });
    const stageIds = stages.map(s => s.id);
    const steps = await this.stepRepository.findAll({
      where: { stageId: { [Op.in]: stageIds }, isActive: true },
    });

    // Get completed workflows
    const stepIds = steps.map(s => s.id);
    const completedWorkflows = await this.taskWorkflowRepository.count({
      where: {
        screenFunctionId,
        stepId: { [Op.in]: stepIds },
        isCompleted: true,
      },
    });

    const total = steps.length;
    const completed = completedWorkflows;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async getProjectProgress(projectId: number): Promise<{
    overall: { total: number; completed: number; percentage: number };
    byStage: Array<{
      stageId: number;
      stageName: string;
      total: number;
      completed: number;
      percentage: number;
    }>;
    byScreenFunction: Array<{
      screenFunctionId: number;
      screenFunctionName: string;
      total: number;
      completed: number;
      percentage: number;
    }>;
  }> {
    const workflow = await this.getProjectWorkflow(projectId);
    const { stages, screenFunctions, taskWorkflows } = workflow;

    // Calculate overall progress
    const overall = workflow.progress;

    // Calculate progress by stage
    const byStage = stages.map((stage: any) => {
      const stageStepIds = stage.steps.map((s: any) => s.id);
      const total = screenFunctions.length * stageStepIds.length;
      const completed = taskWorkflows.filter(
        (tw: any) => stageStepIds.includes(tw.stepId) && tw.isCompleted
      ).length;

      return {
        stageId: stage.id,
        stageName: stage.name,
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    // Calculate progress by screen function
    const allStepIds = stages.flatMap((s: any) => s.steps.map((st: any) => st.id));
    const byScreenFunction = screenFunctions.map((sf: any) => {
      const total = allStepIds.length;
      const completed = taskWorkflows.filter(
        (tw: any) => tw.screenFunctionId === sf.id && tw.isCompleted
      ).length;

      return {
        screenFunctionId: sf.id,
        screenFunctionName: sf.name,
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return { overall, byStage, byScreenFunction };
  }

  // ===== Get workflow stages and steps for a project (with full structure) =====

  async getWorkflowConfiguration(projectId: number): Promise<{
    stages: Array<{
      id: number;
      name: string;
      displayOrder: number;
      isActive: boolean;
      color: string | null;
      steps: Array<{
        id: number;
        name: string;
        displayOrder: number;
        isActive: boolean;
      }>;
    }>;
  }> {
    const stages = await this.stageRepository.findAll({
      where: { projectId },
      order: [['displayOrder', 'ASC']],
    });

    const stageIds = stages.map(s => s.id);
    const steps = await this.stepRepository.findAll({
      where: { stageId: { [Op.in]: stageIds } },
      order: [['displayOrder', 'ASC']],
    });

    const stagesWithSteps = stages.map(stage => ({
      id: stage.id,
      name: stage.name,
      displayOrder: stage.displayOrder,
      isActive: stage.isActive,
      color: stage.color,
      steps: steps
        .filter(s => s.stageId === stage.id)
        .map(s => ({
          id: s.id,
          name: s.name,
          displayOrder: s.displayOrder,
          isActive: s.isActive,
        })),
    }));

    return { stages: stagesWithSteps };
  }
}
