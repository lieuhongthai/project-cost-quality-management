import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { WorkflowStage, StageStatus, DEFAULT_WORKFLOW_STAGES } from './workflow-stage.model';
import { WorkflowStep, DEFAULT_WORKFLOW_STEPS } from './workflow-step.model';
import { TaskWorkflow } from './task-workflow.model';
import { StepScreenFunction } from './step-screen-function.model';
import { StepScreenFunctionMember } from './step-screen-function-member.model';
import { MetricType, DEFAULT_METRIC_TYPES, DEFAULT_METRIC_CATEGORIES } from './metric-type.model';
import { MetricCategory } from './metric-category.model';
import { TaskMemberMetric } from './task-member-metric.model';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { Member } from '../member/member.model';
import { ProjectService } from '../project/project.service';
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
  CreateStepScreenFunctionDto,
  UpdateStepScreenFunctionDto,
  BulkCreateStepScreenFunctionDto,
  BulkUpdateStepScreenFunctionDto,
  CreateStepScreenFunctionMemberDto,
  UpdateStepScreenFunctionMemberDto,
  BulkCreateStepScreenFunctionMemberDto,
  CreateMetricTypeDto,
  UpdateMetricTypeDto,
  CreateMetricCategoryDto,
  UpdateMetricCategoryDto,
  CreateTaskMemberMetricDto,
  UpdateTaskMemberMetricDto,
  BulkUpsertTaskMemberMetricDto,
  InitializeProjectMetricsDto,
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
    @Inject('STEP_SCREEN_FUNCTION_REPOSITORY')
    private stepScreenFunctionRepository: typeof StepScreenFunction,
    @Inject('STEP_SCREEN_FUNCTION_MEMBER_REPOSITORY')
    private stepScreenFunctionMemberRepository: typeof StepScreenFunctionMember,
    @Inject('METRIC_TYPE_REPOSITORY')
    private metricTypeRepository: typeof MetricType,
    @Inject('METRIC_CATEGORY_REPOSITORY')
    private metricCategoryRepository: typeof MetricCategory,
    @Inject('TASK_MEMBER_METRIC_REPOSITORY')
    private taskMemberMetricRepository: typeof TaskMemberMetric,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
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
    stepScreenFunctions: any[];
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

    // Get all StepScreenFunctions for these steps to show read-only status from Stages
    const stepScreenFunctions = await this.stepScreenFunctionRepository.findAll({
      where: { stepId: { [Op.in]: stepIds } },
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
      stepScreenFunctions: stepScreenFunctions.map(ssf => ({
        id: ssf.id,
        stepId: ssf.stepId,
        screenFunctionId: ssf.screenFunctionId,
        status: ssf.status,
      })),
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

  // ===== Step Screen Function Methods =====

  async findAllStepScreenFunctions(stepId: number): Promise<StepScreenFunction[]> {
    return this.stepScreenFunctionRepository.findAll({
      where: { stepId },
      include: [
        { model: ScreenFunction, as: 'screenFunction' },
        { model: StepScreenFunctionMember, as: 'members', include: [{ model: Member, as: 'member' }] },
      ],
    });
  }

  async findStepScreenFunctionById(id: number): Promise<StepScreenFunction> {
    const ssf = await this.stepScreenFunctionRepository.findByPk(id, {
      include: [
        { model: ScreenFunction, as: 'screenFunction' },
        { model: StepScreenFunctionMember, as: 'members', include: [{ model: Member, as: 'member' }] },
      ],
    });
    if (!ssf) {
      throw new NotFoundException(`Step screen function with ID ${id} not found`);
    }
    return ssf;
  }

  async createStepScreenFunction(dto: CreateStepScreenFunctionDto): Promise<StepScreenFunction> {
    const ssf = await this.stepScreenFunctionRepository.create(dto as any);
    // Recalculate parent Stage's effort values
    await this.recalculateStageEffort(dto.stepId);
    return ssf;
  }

  async updateStepScreenFunction(id: number, dto: UpdateStepScreenFunctionDto): Promise<StepScreenFunction> {
    const ssf = await this.findStepScreenFunctionById(id);
    await ssf.update(dto);

    // Recalculate and update parent Stage's effort values
    await this.recalculateStageEffort(ssf.stepId);

    return ssf;
  }

  // Helper method to recalculate and save Stage effort values (only actualEffort and progress)
  private async recalculateStageEffort(stepId: number): Promise<void> {
    // Get the step to find the stage
    const step = await this.stepRepository.findByPk(stepId);
    if (!step) return;

    const stage = await this.stageRepository.findByPk(step.stageId);
    if (!stage) return;

    // Get all steps for this stage
    const steps = await this.stepRepository.findAll({
      where: { stageId: stage.id, isActive: true },
    });
    const stepIds = steps.map(s => s.id);

    // Get all step-screen-functions for these steps
    const stepScreenFunctions = await this.stepScreenFunctionRepository.findAll({
      where: { stepId: { [Op.in]: stepIds } },
    });

    // Calculate totals - only actualEffort and progress, NOT estimatedEffort
    const totalTasks = stepScreenFunctions.length;
    const completedTasks = stepScreenFunctions.filter(ssf => ssf.status === 'Completed').length;
    const progressPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;
    const actualEffort = stepScreenFunctions.reduce((sum, ssf) => sum + (ssf.actualEffort || 0), 0);

    // Use existing estimatedEffort for status calculation (don't override it)
    const estimatedEffort = stage.estimatedEffort || 0;
    const hasEstimatedEffort = estimatedEffort > 0;
    const effortVariance = hasEstimatedEffort
      ? Math.round(((actualEffort - estimatedEffort) / estimatedEffort) * 100)
      : 0;
    const status = this.evaluateStageStatus(stage, progressPercentage, effortVariance, hasEstimatedEffort);

    // Update Stage - only actualEffort and progress, NOT estimatedEffort
    await stage.update({
      progress: progressPercentage,
      actualEffort,
      status,
    });

    await this.projectService.updateProjectMetricsFromStages(stage.projectId);

    await this.projectService.updateProjectMetricsFromStages(stage.projectId);
  }

  async deleteStepScreenFunction(id: number): Promise<void> {
    const ssf = await this.findStepScreenFunctionById(id);
    const stepId = ssf.stepId;
    await ssf.destroy();
    // Recalculate parent Stage's effort values
    await this.recalculateStageEffort(stepId);
  }

  async bulkCreateStepScreenFunctions(dto: BulkCreateStepScreenFunctionDto): Promise<StepScreenFunction[]> {
    const items = dto.items.map(item => ({
      stepId: dto.stepId,
      screenFunctionId: item.screenFunctionId,
      estimatedEffort: item.estimatedEffort || 0,
      note: item.note || null,
    }));
    const result = await this.stepScreenFunctionRepository.bulkCreate(items as any[]);
    // Recalculate parent Stage's effort values
    await this.recalculateStageEffort(dto.stepId);
    return result;
  }

  async bulkUpdateStepScreenFunctions(dto: BulkUpdateStepScreenFunctionDto): Promise<StepScreenFunction[]> {
    const results: StepScreenFunction[] = [];
    const updatedStepIds = new Set<number>();

    for (const item of dto.items) {
      const ssf = await this.stepScreenFunctionRepository.findByPk(item.id);
      if (ssf) {
        const { id, ...updateData } = item;
        await ssf.update(updateData);
        results.push(ssf);
        updatedStepIds.add(ssf.stepId);
      }
    }

    // Recalculate parent Stage's effort values for all affected steps
    for (const stepId of updatedStepIds) {
      await this.recalculateStageEffort(stepId);
    }

    return results;
  }

  // ===== Stage Detail Methods =====

  async getStageDetail(stageId: number): Promise<{
    stage: any;
    steps: any[];
    progress: {
      total: number;
      completed: number;
      percentage: number;
    };
    effort: {
      estimated: number;
      actual: number;
      variance: number;
    };
    status: StageStatus;
  }> {
    const stage = await this.stageRepository.findByPk(stageId);
    if (!stage) {
      throw new NotFoundException(`Stage with ID ${stageId} not found`);
    }

    // Get all steps for this stage
    const steps = await this.stepRepository.findAll({
      where: { stageId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    const stepIds = steps.map(s => s.id);

    // Get all step-screen-function links for these steps
    const stepScreenFunctions = await this.stepScreenFunctionRepository.findAll({
      where: { stepId: { [Op.in]: stepIds } },
      include: [
        { model: ScreenFunction, as: 'screenFunction' },
        { model: StepScreenFunctionMember, as: 'members', include: [{ model: Member, as: 'member' }] },
      ],
    });

    // Calculate progress based on total tasks (step-screen-functions)
    // Progress = completed tasks / total tasks
    const totalTasks = stepScreenFunctions.length;
    const completedTasks = stepScreenFunctions.filter(ssf => ssf.status === 'Completed').length;
    const progressPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Calculate actualEffort from tasks (NOT estimatedEffort - that's set manually via Edit Stage)
    const actualEffort = stepScreenFunctions.reduce((sum, ssf) => sum + (ssf.actualEffort || 0), 0);

    // Use the stored estimatedEffort (manually set via Edit Stage)
    const estimatedEffort = stage.estimatedEffort || 0;
    const hasEstimatedEffort = estimatedEffort > 0;
    const effortVariance = hasEstimatedEffort
      ? Math.round(((actualEffort - estimatedEffort) / estimatedEffort) * 100)
      : 0;

    // Calculate status based on effort and schedule
    const status = this.evaluateStageStatus(stage, progressPercentage, effortVariance, hasEstimatedEffort);

    // Update Stage only actualEffort and progress (NOT estimatedEffort - that's manual)
    await stage.update({
      progress: progressPercentage,
      actualEffort,
      status,
    });

    // Build steps with their linked screen functions and statistics
    const stepsWithLinks = steps.map(step => {
      const stepTasks = stepScreenFunctions.filter(ssf => ssf.stepId === step.id);
      const stepTotalTasks = stepTasks.length;
      const stepCompletedTasks = stepTasks.filter(ssf => ssf.status === 'Completed').length;
      const stepProgressPercentage = stepTotalTasks > 0
        ? Math.round((stepCompletedTasks / stepTotalTasks) * 100)
        : 0;
      const stepEstimatedEffort = stepTasks.reduce((sum, ssf) => sum + (ssf.estimatedEffort || 0), 0);
      const stepActualEffort = stepTasks.reduce((sum, ssf) => sum + (ssf.actualEffort || 0), 0);

      return {
        ...step.toJSON(),
        // Step-level statistics
        statistics: {
          totalTasks: stepTotalTasks,
          completedTasks: stepCompletedTasks,
          progressPercentage: stepProgressPercentage,
          estimatedEffort: stepEstimatedEffort,
          actualEffort: stepActualEffort,
        },
        screenFunctions: stepTasks.map(ssf => ({
          id: ssf.id,
          screenFunctionId: ssf.screenFunctionId,
          screenFunction: ssf.screenFunction,
          members: ssf.members,
          estimatedEffort: ssf.estimatedEffort,
          actualEffort: ssf.actualEffort,
          progress: ssf.progress,
          status: ssf.status,
          note: ssf.note,
          estimatedStartDate: ssf.estimatedStartDate,
          estimatedEndDate: ssf.estimatedEndDate,
          actualStartDate: ssf.actualStartDate,
          actualEndDate: ssf.actualEndDate,
        })),
      };
    });

    return {
      stage: stage.toJSON(),
      steps: stepsWithLinks,
      progress: {
        total: totalTasks,
        completed: completedTasks,
        percentage: progressPercentage,
      },
      effort: {
        estimated: estimatedEffort,
        actual: actualEffort,
        variance: effortVariance,
      },
      status,
    };
  }

  // Evaluate stage status based on effort variance and schedule
  // effortVariance is only meaningful when estimatedEffort > 0
  private evaluateStageStatus(
    stage: WorkflowStage,
    progressPercentage: number,
    effortVariance: number,
    hasEstimatedEffort: boolean = true,
  ): StageStatus {
    const now = new Date();

    // If 100% complete, always return Good (task is done!)
    if (progressPercentage >= 100) {
      return StageStatus.GOOD;
    }

    // Only check effort variance if estimatedEffort was set (meaningful comparison)
    // Only positive variance (over budget) is concerning
    if (hasEstimatedEffort && effortVariance > 20) {
      return StageStatus.AT_RISK;
    }

    // Check schedule if dates are set
    if (stage.endDate) {
      const endDate = new Date(stage.endDate);
      const startDate = stage.startDate ? new Date(stage.startDate) : now;

      // If actualEndDate is set and is later than planned endDate, At Risk
      if (stage.actualEndDate) {
        const actualEndDate = new Date(stage.actualEndDate);
        if (actualEndDate > endDate) {
          return StageStatus.AT_RISK;
        }
      } else {
        // No actualEndDate yet - check if we're past endDate and not complete
        if (now > endDate) {
          return StageStatus.AT_RISK;
        }
      }

      // Check expected progress (only if not yet completed)
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      // Cap expectedProgress at 100%
      const expectedProgress = totalDuration > 0
        ? Math.min((elapsed / totalDuration) * 100, 100)
        : 0;

      // If we're behind expected progress by more than 20%, Warning
      if (expectedProgress > 0 && progressPercentage < expectedProgress - 20) {
        return StageStatus.WARNING;
      }
    }

    // Only check effort variance for Warning level if estimatedEffort was set
    // Only positive variance (over budget) is concerning
    if (hasEstimatedEffort && effortVariance > 10) {
      return StageStatus.WARNING;
    }

    return StageStatus.GOOD;
  }

  // Get all stages with overview for project detail
  async getStagesOverview(projectId: number): Promise<Array<{
    id: number;
    name: string;
    displayOrder: number;
    color: string | null;
    startDate: Date | null;
    endDate: Date | null;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
    estimatedEffort: number;
    actualEffort: number;
    progress: number;
    status: StageStatus;
    stepsCount: number;
    linkedScreensCount: number;
  }>> {
    const stages = await this.stageRepository.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    const result = [];

    for (const stage of stages) {
      // Get steps count
      const steps = await this.stepRepository.findAll({
        where: { stageId: stage.id, isActive: true },
      });
      const stepIds = steps.map(s => s.id);

      // Get linked screen functions (tasks)
      const stepScreenFunctions = await this.stepScreenFunctionRepository.findAll({
        where: { stepId: { [Op.in]: stepIds } },
      });

      // Calculate unique linked screens for display
      const uniqueScreenIds = [...new Set(stepScreenFunctions.map(ssf => ssf.screenFunctionId))];

      // Calculate progress based on total tasks
      const totalTasks = stepScreenFunctions.length;
      const completedTasks = stepScreenFunctions.filter(ssf => ssf.status === 'Completed').length;
      const progressPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // Calculate actualEffort from tasks (NOT estimatedEffort - that's set manually)
      const actualEffort = stepScreenFunctions.reduce((sum, ssf) => sum + (ssf.actualEffort || 0), 0);

      // Use the stored estimatedEffort (manually set via Edit Stage)
      const estimatedEffort = stage.estimatedEffort || 0;
      const hasEstimatedEffort = estimatedEffort > 0;
      const effortVariance = hasEstimatedEffort
        ? Math.round(((actualEffort - estimatedEffort) / estimatedEffort) * 100)
        : 0;

      // Evaluate status
      const status = this.evaluateStageStatus(stage, progressPercentage, effortVariance, hasEstimatedEffort);

      // Update Stage only actualEffort and progress (NOT estimatedEffort - that's manual)
      if (stage.actualEffort !== actualEffort || stage.progress !== progressPercentage) {
        await stage.update({
          progress: progressPercentage,
          actualEffort,
          status,
        });
        await this.projectService.updateProjectMetricsFromStages(stage.projectId);
      }

      result.push({
        id: stage.id,
        name: stage.name,
        displayOrder: stage.displayOrder,
        color: stage.color,
        startDate: stage.startDate,
        endDate: stage.endDate,
        actualStartDate: stage.actualStartDate,
        actualEndDate: stage.actualEndDate,
        estimatedEffort: estimatedEffort,
        actualEffort: actualEffort,
        progress: progressPercentage,
        status: status,
        stepsCount: steps.length,
        linkedScreensCount: uniqueScreenIds.length,
      });
    }

    return result;
  }

  // Get available screen functions that can be linked to a step
  async getAvailableScreenFunctionsForStep(stepId: number): Promise<ScreenFunction[]> {
    const step = await this.stepRepository.findByPk(stepId);
    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    // Get the stage to find the project
    const stage = await this.stageRepository.findByPk(step.stageId);
    if (!stage) {
      throw new NotFoundException(`Stage for step ${stepId} not found`);
    }

    // Get already linked screen functions for this step
    const linkedSFs = await this.stepScreenFunctionRepository.findAll({
      where: { stepId },
      attributes: ['screenFunctionId'],
    });
    const linkedSFIds = linkedSFs.map(sf => sf.screenFunctionId);

    // Get all screen functions for the project that are not linked
    return this.screenFunctionRepository.findAll({
      where: {
        projectId: stage.projectId,
        ...(linkedSFIds.length > 0 ? { id: { [Op.notIn]: linkedSFIds } } : {}),
      },
      order: [['displayOrder', 'ASC'], ['name', 'ASC']],
    });
  }

  // ===== Step Screen Function Member Methods =====

  async findAllStepScreenFunctionMembers(stepScreenFunctionId: number): Promise<StepScreenFunctionMember[]> {
    return this.stepScreenFunctionMemberRepository.findAll({
      where: { stepScreenFunctionId },
      include: [{ model: Member, as: 'member' }],
    });
  }

  async findStepScreenFunctionMemberById(id: number): Promise<StepScreenFunctionMember> {
    const member = await this.stepScreenFunctionMemberRepository.findByPk(id, {
      include: [{ model: Member, as: 'member' }],
    });
    if (!member) {
      throw new NotFoundException(`Step screen function member with ID ${id} not found`);
    }
    return member;
  }

  async createStepScreenFunctionMember(dto: CreateStepScreenFunctionMemberDto): Promise<StepScreenFunctionMember> {
    const member = await this.stepScreenFunctionMemberRepository.create(dto as any);
    // Recalculate parent StepScreenFunction's effort and progress
    await this.recalculateStepScreenFunctionFromMembers(dto.stepScreenFunctionId);
    return this.findStepScreenFunctionMemberById(member.id);
  }

  async updateStepScreenFunctionMember(id: number, dto: UpdateStepScreenFunctionMemberDto): Promise<StepScreenFunctionMember> {
    const member = await this.findStepScreenFunctionMemberById(id);
    await member.update(dto);
    // Recalculate parent StepScreenFunction's effort and progress
    await this.recalculateStepScreenFunctionFromMembers(member.stepScreenFunctionId);
    return this.findStepScreenFunctionMemberById(id);
  }

  async deleteStepScreenFunctionMember(id: number): Promise<void> {
    const member = await this.findStepScreenFunctionMemberById(id);
    const stepScreenFunctionId = member.stepScreenFunctionId;
    await member.destroy();
    // Recalculate parent StepScreenFunction's effort and progress
    await this.recalculateStepScreenFunctionFromMembers(stepScreenFunctionId);
  }

  async bulkCreateStepScreenFunctionMembers(dto: BulkCreateStepScreenFunctionMemberDto): Promise<StepScreenFunctionMember[]> {
    const items = dto.items.map(item => ({
      stepScreenFunctionId: dto.stepScreenFunctionId,
      ...item,
    }));
    const result = await this.stepScreenFunctionMemberRepository.bulkCreate(items as any[]);
    // Recalculate parent StepScreenFunction's effort and progress
    await this.recalculateStepScreenFunctionFromMembers(dto.stepScreenFunctionId);
    return this.findAllStepScreenFunctionMembers(dto.stepScreenFunctionId);
  }

  // Helper method to recalculate StepScreenFunction effort and progress from its members
  private async recalculateStepScreenFunctionFromMembers(stepScreenFunctionId: number): Promise<void> {
    const ssf = await this.stepScreenFunctionRepository.findByPk(stepScreenFunctionId);
    if (!ssf) return;

    // Get all members for this step-screen-function
    const members = await this.stepScreenFunctionMemberRepository.findAll({
      where: { stepScreenFunctionId },
    });

    if (members.length === 0) {
      // No members, reset to 0
      await ssf.update({
        estimatedEffort: 0,
        actualEffort: 0,
        progress: 0,
      });
    } else {
      // Sum of efforts
      const totalEstimatedEffort = members.reduce((sum, m) => sum + (m.estimatedEffort || 0), 0);
      const totalActualEffort = members.reduce((sum, m) => sum + (m.actualEffort || 0), 0);
      // Average progress (simple average)
      const avgProgress = members.reduce((sum, m) => sum + (m.progress || 0), 0) / members.length;

      await ssf.update({
        estimatedEffort: totalEstimatedEffort,
        actualEffort: totalActualEffort,
        progress: Math.round(avgProgress),
      });
    }

    // Also recalculate parent Stage's effort values
    await this.recalculateStageEffort(ssf.stepId);
  }

  // ===== Metric Type Methods =====

  async findAllMetricTypes(projectId: number): Promise<MetricType[]> {
    return this.metricTypeRepository.findAll({
      where: { projectId },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      include: [{ model: MetricCategory, as: 'categories' }],
    });
  }

  async findMetricTypeById(id: number): Promise<MetricType> {
    const metricType = await this.metricTypeRepository.findByPk(id, {
      include: [{ model: MetricCategory, as: 'categories' }],
    });
    if (!metricType) {
      throw new NotFoundException(`Metric type with ID ${id} not found`);
    }
    return metricType;
  }

  async createMetricType(dto: CreateMetricTypeDto): Promise<MetricType> {
    const metricTypes = await this.findAllMetricTypes(dto.projectId);
    const maxOrder = metricTypes.length > 0
      ? Math.max(...metricTypes.map(t => t.displayOrder || 0))
      : 0;

    return this.metricTypeRepository.create({
      ...dto,
      displayOrder: dto.displayOrder ?? maxOrder + 1,
    } as any);
  }

  async updateMetricType(id: number, dto: UpdateMetricTypeDto): Promise<MetricType> {
    const metricType = await this.findMetricTypeById(id);
    await metricType.update(dto);
    return metricType;
  }

  async deleteMetricType(id: number): Promise<void> {
    const metricType = await this.findMetricTypeById(id);
    if (this.isProtectedMetricType(metricType.name)) {
      throw new BadRequestException('Cannot delete protected metric type');
    }
    await metricType.destroy();
  }

  // ===== Metric Category Methods =====

  async findAllMetricCategories(metricTypeId: number): Promise<MetricCategory[]> {
    return this.metricCategoryRepository.findAll({
      where: { metricTypeId },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
  }

  async findMetricCategoryById(id: number): Promise<MetricCategory> {
    const category = await this.metricCategoryRepository.findByPk(id, {
      include: [{ model: MetricType, as: 'metricType' }],
    });
    if (!category) {
      throw new NotFoundException(`Metric category with ID ${id} not found`);
    }
    return category;
  }

  async createMetricCategory(dto: CreateMetricCategoryDto): Promise<MetricCategory> {
    const categories = await this.findAllMetricCategories(dto.metricTypeId);
    const maxOrder = categories.length > 0
      ? Math.max(...categories.map(c => c.displayOrder || 0))
      : 0;

    return this.metricCategoryRepository.create({
      ...dto,
      displayOrder: dto.displayOrder ?? maxOrder + 1,
    } as any);
  }

  async updateMetricCategory(id: number, dto: UpdateMetricCategoryDto): Promise<MetricCategory> {
    const category = await this.findMetricCategoryById(id);
    await category.update(dto);
    return category;
  }

  async deleteMetricCategory(id: number): Promise<void> {
    const category = await this.findMetricCategoryById(id);
    if (this.isProtectedMetricCategory(category)) {
      throw new BadRequestException('Cannot delete protected metric category');
    }
    await category.destroy();
  }

  async getProjectMetricInsights(projectId: number) {
    const stages = await this.stageRepository.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });
    const stageIds = stages.map(stage => stage.id);
    const steps = await this.stepRepository.findAll({
      where: { stageId: { [Op.in]: stageIds }, isActive: true },
      order: [['displayOrder', 'ASC']],
    });
    const stepIds = steps.map(step => step.id);
    const stepScreenFunctions = await this.stepScreenFunctionRepository.findAll({
      where: { stepId: { [Op.in]: stepIds } },
    });
    const stepScreenFunctionIds = stepScreenFunctions.map(ssf => ssf.id);
    const stepScreenFunctionMembers = await this.stepScreenFunctionMemberRepository.findAll({
      where: { stepScreenFunctionId: { [Op.in]: stepScreenFunctionIds } },
    });
    const stepScreenFunctionMemberIds = stepScreenFunctionMembers.map(member => member.id);

    const metrics = stepScreenFunctionMemberIds.length > 0
      ? await this.taskMemberMetricRepository.findAll({
        where: { stepScreenFunctionMemberId: { [Op.in]: stepScreenFunctionMemberIds } },
        include: [
          {
            model: MetricCategory,
            as: 'metricCategory',
            include: [{ model: MetricType, as: 'metricType' }],
          },
        ],
      })
      : [];

    const stepIdToStageId = new Map(steps.map(step => [step.id, step.stageId]));
    const memberToStepScreenFunction = new Map(
      stepScreenFunctionMembers.map(member => [member.id, member.stepScreenFunctionId]),
    );
    const stepEffortByStepScreenFunction = new Map<number, number>();
    for (const member of stepScreenFunctionMembers) {
      if (member.actualEffort > 0) {
        stepEffortByStepScreenFunction.set(
          member.stepScreenFunctionId,
          (stepEffortByStepScreenFunction.get(member.stepScreenFunctionId) || 0) + member.actualEffort,
        );
      }
    }

    const stepTotals = new Map<number, { totalTestCases: number; bugCount: number }>();
    const ensureStepTotals = (stepScreenFunctionId: number) => {
      if (!stepTotals.has(stepScreenFunctionId)) {
        stepTotals.set(stepScreenFunctionId, { totalTestCases: 0, bugCount: 0 });
      }
      return stepTotals.get(stepScreenFunctionId)!;
    };

    for (const metric of metrics) {
      const category = metric.metricCategory;
      const metricTypeName = category?.metricType?.name || '';
      const categoryName = category?.name || '';
      const stepScreenFunctionId = memberToStepScreenFunction.get(metric.stepScreenFunctionMemberId);
      if (!stepScreenFunctionId) continue;
      const totals = ensureStepTotals(stepScreenFunctionId);
      if (this.isTestCaseTotalMetric(metricTypeName, categoryName)) {
        totals.totalTestCases += metric.value || 0;
      }
      if (this.isTestCaseFailedMetric(metricTypeName, categoryName)) {
        totals.bugCount += metric.value || 0;
      }
    }

    const stepInsights = stepScreenFunctions.map(ssf => {
      const totals = stepTotals.get(ssf.id) || { totalTestCases: 0, bugCount: 0 };
      const actualHours = stepEffortByStepScreenFunction.get(ssf.id) || ssf.actualEffort || 0;
      const actualMinutes = actualHours * 60;
      return {
        stepScreenFunctionId: ssf.id,
        stepId: ssf.stepId,
        screenFunctionId: ssf.screenFunctionId,
        totalTestCases: totals.totalTestCases,
        bugCount: totals.bugCount,
        bugRate: totals.totalTestCases > 0 ? totals.bugCount / totals.totalTestCases : 0,
        testCasesPerMinute: actualMinutes > 0 ? totals.totalTestCases / actualMinutes : 0,
        actualMinutes,
      };
    });

    const stageInsightsMap = new Map<number, {
      totalTestCases: number;
      bugCount: number;
      actualMinutes: number;
    }>();
    for (const insight of stepInsights) {
      const stageId = stepIdToStageId.get(insight.stepId);
      if (!stageId) continue;
      const stageTotals = stageInsightsMap.get(stageId) || {
        totalTestCases: 0,
        bugCount: 0,
        actualMinutes: 0,
      };
      stageTotals.totalTestCases += insight.totalTestCases;
      stageTotals.bugCount += insight.bugCount;
      stageTotals.actualMinutes += insight.actualMinutes;
      stageInsightsMap.set(stageId, stageTotals);
    }

    const stageInsights = stages.map(stage => {
      const totals = stageInsightsMap.get(stage.id) || {
        totalTestCases: 0,
        bugCount: 0,
        actualMinutes: 0,
      };
      return {
        stageId: stage.id,
        totalTestCases: totals.totalTestCases,
        bugCount: totals.bugCount,
        bugRate: totals.totalTestCases > 0 ? totals.bugCount / totals.totalTestCases : 0,
        testCasesPerMinute: totals.actualMinutes > 0 ? totals.totalTestCases / totals.actualMinutes : 0,
        actualMinutes: totals.actualMinutes,
      };
    });

    const projectTotals = stageInsights.reduce(
      (acc, item) => ({
        totalTestCases: acc.totalTestCases + item.totalTestCases,
        bugCount: acc.bugCount + item.bugCount,
        actualMinutes: acc.actualMinutes + item.actualMinutes,
      }),
      { totalTestCases: 0, bugCount: 0, actualMinutes: 0 },
    );

    return {
      project: {
        totalTestCases: projectTotals.totalTestCases,
        bugCount: projectTotals.bugCount,
        bugRate: projectTotals.totalTestCases > 0 ? projectTotals.bugCount / projectTotals.totalTestCases : 0,
        testCasesPerMinute: projectTotals.actualMinutes > 0 ? projectTotals.totalTestCases / projectTotals.actualMinutes : 0,
        actualMinutes: projectTotals.actualMinutes,
      },
      stages: stageInsights,
      stepScreenFunctions: stepInsights,
    };
  }

  async getProjectMetricTypeSummary(projectId: number) {
    const metricTypes = await this.metricTypeRepository.findAll({
      where: { projectId, isActive: true },
      include: [
        {
          model: MetricCategory,
          as: 'categories',
          where: { isActive: true },
          required: false,
        },
      ],
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });

    const stages = await this.stageRepository.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    const stageIds = stages.map(stage => stage.id);
    const steps = await this.stepRepository.findAll({
      where: { stageId: { [Op.in]: stageIds }, isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    });
    const stepIds = steps.map(step => step.id);
    const stepScreenFunctions = await this.stepScreenFunctionRepository.findAll({
      where: { stepId: { [Op.in]: stepIds } },
    });
    const stepScreenFunctionIds = stepScreenFunctions.map(ssf => ssf.id);
    const screenFunctionIds = stepScreenFunctions.map(ssf => ssf.screenFunctionId);
    const screenFunctions = await this.screenFunctionRepository.findAll({
      where: { id: { [Op.in]: screenFunctionIds } },
    });
    const screenFunctionNameMap = new Map(
      screenFunctions.map(screenFunction => [screenFunction.id, screenFunction.name]),
    );

    const stepScreenFunctionMembers = await this.stepScreenFunctionMemberRepository.findAll({
      where: { stepScreenFunctionId: { [Op.in]: stepScreenFunctionIds } },
    });
    const stepScreenFunctionMemberIds = stepScreenFunctionMembers.map(member => member.id);

    const metrics = stepScreenFunctionMemberIds.length > 0
      ? await this.taskMemberMetricRepository.findAll({
        where: { stepScreenFunctionMemberId: { [Op.in]: stepScreenFunctionMemberIds } },
      })
      : [];

    const memberToStepScreenFunction = new Map(
      stepScreenFunctionMembers.map(member => [member.id, member.stepScreenFunctionId]),
    );

    const metricTotalsByStepScreenFunction = new Map<number, Map<number, number>>();

    for (const metric of metrics) {
      const stepScreenFunctionId = memberToStepScreenFunction.get(metric.stepScreenFunctionMemberId);
      if (!stepScreenFunctionId) continue;
      const categoryTotals = metricTotalsByStepScreenFunction.get(stepScreenFunctionId) || new Map<number, number>();
      const currentValue = categoryTotals.get(metric.metricCategoryId) || 0;
      categoryTotals.set(metric.metricCategoryId, currentValue + (metric.value || 0));
      metricTotalsByStepScreenFunction.set(stepScreenFunctionId, categoryTotals);
    }

    const stepsByStage = new Map<number, WorkflowStep[]>();
    for (const step of steps) {
      const group = stepsByStage.get(step.stageId) || [];
      group.push(step);
      stepsByStage.set(step.stageId, group);
    }

    const screenFunctionsByStep = new Map<number, StepScreenFunction[]>();
    for (const screenFunction of stepScreenFunctions) {
      const group = screenFunctionsByStep.get(screenFunction.stepId) || [];
      group.push(screenFunction);
      screenFunctionsByStep.set(screenFunction.stepId, group);
    }

    return {
      metricTypes: metricTypes.map(type => ({
        id: type.id,
        name: type.name,
        categories: (type.categories || []).sort((a, b) => {
          if (a.displayOrder !== b.displayOrder) {
            return (a.displayOrder || 0) - (b.displayOrder || 0);
          }
          return a.id - b.id;
        }).map(category => ({
          id: category.id,
          name: category.name,
        })),
      })),
      stages: stages.map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        steps: (stepsByStage.get(stage.id) || []).map(step => ({
          stepId: step.id,
          stepName: step.name,
          screenFunctions: (screenFunctionsByStep.get(step.id) || []).map(screenFunction => ({
            stepScreenFunctionId: screenFunction.id,
            screenFunctionId: screenFunction.screenFunctionId,
            screenFunctionName: screenFunctionNameMap.get(screenFunction.screenFunctionId) || '',
            metrics: Array.from(metricTotalsByStepScreenFunction.get(screenFunction.id)?.entries() || []).map(
              ([metricCategoryId, value]) => ({
                metricCategoryId,
                value,
              }),
            ),
          })),
        })),
      })),
    };
  }

  private isProtectedMetricType(name: string): boolean {
    return name.trim().toLowerCase() === 'test cases';
  }

  private isTestCaseTotalMetric(metricTypeName: string, categoryName: string): boolean {
    return metricTypeName.trim().toLowerCase() === 'test cases'
      && categoryName.trim().toLowerCase() === 'total';
  }

  private isTestCaseFailedMetric(metricTypeName: string, categoryName: string): boolean {
    return metricTypeName.trim().toLowerCase() === 'test cases'
      && categoryName.trim().toLowerCase() === 'failed';
  }

  private isProtectedMetricCategory(category: MetricCategory): boolean {
    const metricTypeName = category.metricType?.name || '';
    if (!this.isProtectedMetricType(metricTypeName)) {
      return false;
    }
    const protectedNames = new Set(['total', 'passed', 'failed']);
    return protectedNames.has(category.name.trim().toLowerCase());
  }

  // ===== Task Member Metric Methods =====

  async findAllTaskMemberMetrics(stepScreenFunctionMemberId: number): Promise<TaskMemberMetric[]> {
    return this.taskMemberMetricRepository.findAll({
      where: { stepScreenFunctionMemberId },
      include: [{ model: MetricCategory, as: 'metricCategory' }],
    });
  }

  async findTaskMemberMetricById(id: number): Promise<TaskMemberMetric> {
    const metric = await this.taskMemberMetricRepository.findByPk(id, {
      include: [{ model: MetricCategory, as: 'metricCategory' }],
    });
    if (!metric) {
      throw new NotFoundException(`Task member metric with ID ${id} not found`);
    }
    return metric;
  }

  async createTaskMemberMetric(dto: CreateTaskMemberMetricDto): Promise<TaskMemberMetric> {
    return this.taskMemberMetricRepository.create(dto as any);
  }

  async updateTaskMemberMetric(id: number, dto: UpdateTaskMemberMetricDto): Promise<TaskMemberMetric> {
    const metric = await this.findTaskMemberMetricById(id);
    await metric.update(dto);
    return metric;
  }

  async deleteTaskMemberMetric(id: number): Promise<void> {
    const metric = await this.findTaskMemberMetricById(id);
    await metric.destroy();
  }

  async bulkUpsertTaskMemberMetrics(dto: BulkUpsertTaskMemberMetricDto): Promise<TaskMemberMetric[]> {
    for (const metricItem of dto.metrics) {
      // Check if metric already exists
      const existing = await this.taskMemberMetricRepository.findOne({
        where: {
          stepScreenFunctionMemberId: dto.stepScreenFunctionMemberId,
          metricCategoryId: metricItem.metricCategoryId,
        },
      });

      if (existing) {
        // Update existing
        await existing.update({
          value: metricItem.value ?? 0,
          note: metricItem.note,
        });
      } else {
        // Create new
        await this.taskMemberMetricRepository.create({
          stepScreenFunctionMemberId: dto.stepScreenFunctionMemberId,
          metricCategoryId: metricItem.metricCategoryId,
          value: metricItem.value ?? 0,
          note: metricItem.note,
        } as any);
      }
    }

    return this.findAllTaskMemberMetrics(dto.stepScreenFunctionMemberId);
  }

  // ===== Initialize Project Metrics =====

  async initializeProjectMetrics(dto: InitializeProjectMetricsDto): Promise<{ metricTypes: MetricType[]; }> {
    const existingTypes = await this.findAllMetricTypes(dto.projectId);
    if (existingTypes.length > 0) {
      return { metricTypes: existingTypes };
    }

    const metricTypes: MetricType[] = [];

    for (const typeTemplate of DEFAULT_METRIC_TYPES) {
      const metricType = await this.metricTypeRepository.create({
        projectId: dto.projectId,
        name: typeTemplate.name,
        description: typeTemplate.description,
        displayOrder: typeTemplate.displayOrder,
        isActive: true,
      } as any);
      metricTypes.push(metricType);

      // Create default categories for this type
      const typeCategories = DEFAULT_METRIC_CATEGORIES[typeTemplate.name] || [];
      for (let i = 0; i < typeCategories.length; i++) {
        await this.metricCategoryRepository.create({
          metricTypeId: metricType.id,
          name: typeCategories[i].name,
          description: typeCategories[i].description,
          displayOrder: i + 1,
          isActive: true,
        } as any);
      }
    }

    // Re-fetch with categories included
    return { metricTypes: await this.findAllMetricTypes(dto.projectId) };
  }
}
