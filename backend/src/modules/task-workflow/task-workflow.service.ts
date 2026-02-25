import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { WorkflowStage, StageStatus, DEFAULT_WORKFLOW_STAGES } from './workflow-stage.model';
import { WorkflowStep, DEFAULT_WORKFLOW_STEPS } from './workflow-step.model';
import { TaskWorkflow } from './task-workflow.model';
import { StepScreenFunction } from './step-screen-function.model';
import { StepScreenFunctionMember } from './step-screen-function-member.model';
import { MetricType, DEFAULT_METRIC_TYPES, DEFAULT_METRIC_CATEGORIES } from './metric-type.model';
import { MetricCategory } from './metric-category.model';
import { TaskMemberMetric } from './task-member-metric.model';
import { WorklogMappingRule } from './worklog-mapping-rule.model';
import { WorklogImportBatch } from './worklog-import-batch.model';
import { WorklogImportItem } from './worklog-import-item.model';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { ScreenFunctionDefaultMember } from '../screen-function/screen-function-default-member.model';
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
  CreateWorklogMappingRuleDto,
  UpdateWorklogMappingRuleDto,
  CommitWorklogImportDto,
  WorklogImportOverrideItemDto,
} from './task-workflow.dto';
import { Op } from 'sequelize';
import OpenAI from 'openai';

@Injectable()
export class TaskWorkflowService {
  private openai: OpenAI;
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
    @Inject('WORKLOG_MAPPING_RULE_REPOSITORY')
    private worklogMappingRuleRepository: typeof WorklogMappingRule,
    @Inject('WORKLOG_IMPORT_BATCH_REPOSITORY')
    private worklogImportBatchRepository: typeof WorklogImportBatch,
    @Inject('WORKLOG_IMPORT_ITEM_REPOSITORY')
    private worklogImportItemRepository: typeof WorklogImportItem,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }

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
    // Recalculate parent ScreenFunction's aggregated values
    await this.recalculateScreenFunctionFromSteps(dto.screenFunctionId);
    return ssf;
  }

  async updateStepScreenFunction(id: number, dto: UpdateStepScreenFunctionDto): Promise<StepScreenFunction> {
    const ssf = await this.findStepScreenFunctionById(id);
    await ssf.update(dto);

    // Recalculate and update parent Stage's effort values
    await this.recalculateStageEffort(ssf.stepId);
    // Recalculate parent ScreenFunction's aggregated values
    await this.recalculateScreenFunctionFromSteps(ssf.screenFunctionId);

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
  }

  async deleteStepScreenFunction(id: number): Promise<void> {
    const ssf = await this.findStepScreenFunctionById(id);
    const stepId = ssf.stepId;
    const screenFunctionId = ssf.screenFunctionId;
    await ssf.destroy();
    // Recalculate parent Stage's effort values
    await this.recalculateStageEffort(stepId);
    // Recalculate parent ScreenFunction's aggregated values
    await this.recalculateScreenFunctionFromSteps(screenFunctionId);
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
    // Recalculate parent ScreenFunction's aggregated values for each affected screen function
    const affectedScreenFunctionIds = [...new Set(dto.items.map(item => item.screenFunctionId))];
    for (const sfId of affectedScreenFunctionIds) {
      await this.recalculateScreenFunctionFromSteps(sfId);
    }
    return result;
  }

  async bulkUpdateStepScreenFunctions(dto: BulkUpdateStepScreenFunctionDto): Promise<StepScreenFunction[]> {
    const results: StepScreenFunction[] = [];
    const updatedStepIds = new Set<number>();
    const updatedScreenFunctionIds = new Set<number>();

    for (const item of dto.items) {
      const ssf = await this.stepScreenFunctionRepository.findByPk(item.id);
      if (ssf) {
        const { id, ...updateData } = item;
        await ssf.update(updateData);
        results.push(ssf);
        updatedStepIds.add(ssf.stepId);
        updatedScreenFunctionIds.add(ssf.screenFunctionId);
      }
    }

    // Recalculate parent Stage's effort values for all affected steps
    for (const stepId of updatedStepIds) {
      await this.recalculateStageEffort(stepId);
    }

    // Recalculate parent ScreenFunction's aggregated values for all affected screen functions
    for (const sfId of updatedScreenFunctionIds) {
      await this.recalculateScreenFunctionFromSteps(sfId);
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

  // Get Screen/Function statistics grouped by Stage and Step
  async getScreenFunctionStageStats(projectId: number) {
    const stages = await this.stageRepository.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    const allScreenFunctions = await this.screenFunctionRepository.findAll({
      where: { projectId },
    });
    const sfMap = new Map(allScreenFunctions.map(sf => [sf.id, sf]));

    const result = [];

    for (const stage of stages) {
      const steps = await this.stepRepository.findAll({
        where: { stageId: stage.id, isActive: true },
        order: [['displayOrder', 'ASC']],
      });
      const stepIds = steps.map(s => s.id);

      // Get all StepScreenFunctions for this stage
      const stageSSFs = stepIds.length > 0
        ? await this.stepScreenFunctionRepository.findAll({
            where: { stepId: { [Op.in]: stepIds } },
          })
        : [];

      // Group SSFs by stepId
      const ssfByStep = new Map<number, typeof stageSSFs>();
      for (const ssf of stageSSFs) {
        const existing = ssfByStep.get(ssf.stepId) || [];
        existing.push(ssf);
        ssfByStep.set(ssf.stepId, existing);
      }

      // Stage-level aggregation
      const stageUniqueScreenIds = [...new Set(stageSSFs.map(ssf => ssf.screenFunctionId))];
      const stageTotalTasks = stageSSFs.length;
      const stageCompleted = stageSSFs.filter(ssf => ssf.status === 'Completed').length;
      const stageInProgress = stageSSFs.filter(ssf => ssf.status === 'In Progress').length;
      const stagePending = stageTotalTasks - stageCompleted - stageInProgress;
      const stageEstEffort = stageSSFs.reduce((sum, ssf) => sum + (ssf.estimatedEffort || 0), 0);
      const stageActEffort = stageSSFs.reduce((sum, ssf) => sum + (ssf.actualEffort || 0), 0);
      const stageProgress = stageTotalTasks > 0
        ? Math.round((stageCompleted / stageTotalTasks) * 100)
        : 0;

      // Build step-level statistics
      const stepsStats = steps.map(step => {
        const stepSSFs = ssfByStep.get(step.id) || [];
        const stepUniqueScreenIds = [...new Set(stepSSFs.map(ssf => ssf.screenFunctionId))];
        const totalTasks = stepSSFs.length;
        const completed = stepSSFs.filter(ssf => ssf.status === 'Completed').length;
        const inProgress = stepSSFs.filter(ssf => ssf.status === 'In Progress').length;
        const pending = totalTasks - completed - inProgress;
        const estEffort = stepSSFs.reduce((sum, ssf) => sum + (ssf.estimatedEffort || 0), 0);
        const actEffort = stepSSFs.reduce((sum, ssf) => sum + (ssf.actualEffort || 0), 0);
        const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        // Build screen function details for this step
        const screenFunctions = stepSSFs.map(ssf => {
          const sf = sfMap.get(ssf.screenFunctionId);
          return {
            stepScreenFunctionId: ssf.id,
            screenFunctionId: ssf.screenFunctionId,
            screenFunctionName: sf?.name || 'Unknown',
            screenFunctionType: sf?.type || 'Screen',
            estimatedEffort: ssf.estimatedEffort || 0,
            actualEffort: ssf.actualEffort || 0,
            progress: ssf.progress || 0,
            status: ssf.status,
          };
        });

        return {
          stepId: step.id,
          stepName: step.name,
          displayOrder: step.displayOrder,
          linkedScreensCount: stepUniqueScreenIds.length,
          totalTasks,
          completedTasks: completed,
          inProgressTasks: inProgress,
          pendingTasks: pending,
          estimatedEffort: estEffort,
          actualEffort: actEffort,
          progress,
          screenFunctions,
        };
      });

      result.push({
        stageId: stage.id,
        stageName: stage.name,
        stageColor: stage.color,
        displayOrder: stage.displayOrder,
        linkedScreensCount: stageUniqueScreenIds.length,
        totalTasks: stageTotalTasks,
        completedTasks: stageCompleted,
        inProgressTasks: stageInProgress,
        pendingTasks: stagePending,
        estimatedEffort: stageEstEffort,
        actualEffort: stageActEffort,
        progress: stageProgress,
        steps: stepsStats,
      });
    }

    return result;
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
    // Also recalculate parent ScreenFunction's aggregated values
    await this.recalculateScreenFunctionFromSteps(ssf.screenFunctionId);
  }

  // Recalculate all ScreenFunctions for a project from their StepScreenFunction data
  async recalculateAllScreenFunctionsForProject(projectId: number): Promise<void> {
    const screenFunctions = await this.screenFunctionRepository.findAll({
      where: { projectId },
    });
    for (const sf of screenFunctions) {
      await this.recalculateScreenFunctionFromSteps(sf.id);
    }
  }

  // Helper method to recalculate ScreenFunction effort/progress/status from its StepScreenFunctions
  private async recalculateScreenFunctionFromSteps(screenFunctionId: number): Promise<void> {
    const screenFunction = await this.screenFunctionRepository.findByPk(screenFunctionId);
    if (!screenFunction) return;

    // Get all StepScreenFunction records linked to this ScreenFunction across all steps/stages
    const stepScreenFunctions = await this.stepScreenFunctionRepository.findAll({
      where: { screenFunctionId },
    });

    if (stepScreenFunctions.length === 0) {
      // No StepScreenFunctions linked - reset to defaults
      await screenFunction.update({
        actualEffort: 0,
        progress: 0,
        status: 'Not Started',
      });
      return;
    }

    // Aggregate estimatedEffort and actualEffort from all linked StepScreenFunctions
    const totalEstimatedEffort = stepScreenFunctions.reduce(
      (sum, ssf) => sum + (ssf.estimatedEffort || 0), 0,
    );
    const totalActualEffort = stepScreenFunctions.reduce(
      (sum, ssf) => sum + (ssf.actualEffort || 0), 0,
    );

    // Calculate progress based on completed tasks
    const totalTasks = stepScreenFunctions.length;
    const completedTasks = stepScreenFunctions.filter(
      ssf => ssf.status === 'Completed',
    ).length;
    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

    // Determine status from StepScreenFunction statuses
    const allCompleted = stepScreenFunctions.every(ssf => ssf.status === 'Completed');
    const allNotStarted = stepScreenFunctions.every(
      ssf => ssf.status === 'Not Started',
    );

    let status: string;
    if (allCompleted) {
      status = 'Completed';
    } else if (allNotStarted) {
      status = 'Not Started';
    } else {
      status = 'In Progress';
    }

    await screenFunction.update({
      estimatedEffort: totalEstimatedEffort,
      actualEffort: totalActualEffort,
      progress: progressPercentage,
      status,
    });
  }

  // ===== Quick Link: Auto-link all ScreenFunctions of a type to all steps of a stage =====

  async quickLinkByType(stageId: number, screenFunctionType: string, assignMembers: boolean = false): Promise<{
    created: number;
    skipped: number;
    membersAssigned: number;
    details: Array<{ stepId: number; stepName: string; linked: number; membersAssigned: number }>;
  }> {
    const stage = await this.stageRepository.findByPk(stageId);
    if (!stage) {
      throw new NotFoundException(`Stage with ID ${stageId} not found`);
    }

    // Get all active steps for this stage
    const steps = await this.stepRepository.findAll({
      where: { stageId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    if (steps.length === 0) {
      return { created: 0, skipped: 0, membersAssigned: 0, details: [] };
    }

    // Get all screen functions of the specified type for the project
    const screenFunctions = await this.screenFunctionRepository.findAll({
      where: { projectId: stage.projectId, type: screenFunctionType },
      order: [['displayOrder', 'ASC']],
    });

    if (screenFunctions.length === 0) {
      return { created: 0, skipped: 0, membersAssigned: 0, details: [] };
    }

    const stepIds = steps.map(s => s.id);
    const sfIds = screenFunctions.map(sf => sf.id);

    // If assignMembers is true, load default members for all screen functions
    let defaultMembersBySf = new Map<number, number[]>();
    if (assignMembers) {
      const defaultMembers = await ScreenFunctionDefaultMember.findAll({
        where: { screenFunctionId: { [Op.in]: sfIds } },
      });
      for (const dm of defaultMembers) {
        const existing = defaultMembersBySf.get(dm.screenFunctionId) || [];
        existing.push(dm.memberId);
        defaultMembersBySf.set(dm.screenFunctionId, existing);
      }
    }

    // Get all existing StepScreenFunction records for these steps
    const existingSSFs = await this.stepScreenFunctionRepository.findAll({
      where: {
        stepId: { [Op.in]: stepIds },
        screenFunctionId: { [Op.in]: sfIds },
      },
    });

    // Build a set of existing (stepId, screenFunctionId) pairs
    const existingSet = new Set(
      existingSSFs.map(ssf => `${ssf.stepId}-${ssf.screenFunctionId}`),
    );

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalMembersAssigned = 0;
    const details: Array<{ stepId: number; stepName: string; linked: number; membersAssigned: number }> = [];
    const affectedScreenFunctionIds = new Set<number>();

    for (const step of steps) {
      const newItems: Array<{ stepId: number; screenFunctionId: number; estimatedEffort: number }> = [];

      for (const sf of screenFunctions) {
        const key = `${step.id}-${sf.id}`;
        if (existingSet.has(key)) {
          totalSkipped++;
        } else {
          newItems.push({
            stepId: step.id,
            screenFunctionId: sf.id,
            estimatedEffort: 0,
          });
          affectedScreenFunctionIds.add(sf.id);
        }
      }

      let stepMembersAssigned = 0;

      if (newItems.length > 0) {
        const createdSSFs = await this.stepScreenFunctionRepository.bulkCreate(newItems as any[]);
        totalCreated += newItems.length;

        // Auto-assign default members if option is enabled
        if (assignMembers) {
          const memberItems: Array<{ stepScreenFunctionId: number; memberId: number }> = [];
          for (const ssf of createdSSFs) {
            const memberIds = defaultMembersBySf.get(ssf.screenFunctionId) || [];
            for (const memberId of memberIds) {
              memberItems.push({
                stepScreenFunctionId: ssf.id,
                memberId,
              });
            }
          }
          if (memberItems.length > 0) {
            await this.stepScreenFunctionMemberRepository.bulkCreate(memberItems as any[]);
            stepMembersAssigned = memberItems.length;
            totalMembersAssigned += memberItems.length;
          }
        }
      }

      details.push({
        stepId: step.id,
        stepName: step.name,
        linked: newItems.length,
        membersAssigned: stepMembersAssigned,
      });
    }

    // Recalculate stage effort for all affected steps
    for (const stepId of stepIds) {
      await this.recalculateStageEffort(stepId);
    }

    // Recalculate all affected screen functions
    for (const sfId of affectedScreenFunctionIds) {
      await this.recalculateScreenFunctionFromSteps(sfId);
    }

    return { created: totalCreated, skipped: totalSkipped, membersAssigned: totalMembersAssigned, details };
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


  // ===== Worklog Mapping Rule Methods =====

  async getWorklogMappingRules(projectId: number): Promise<WorklogMappingRule[]> {
    return this.worklogMappingRuleRepository.findAll({
      where: { projectId },
      include: [
        { model: WorkflowStage, as: 'stage' },
        { model: WorkflowStep, as: 'step' },
      ],
      order: [['priority', 'DESC'], ['id', 'ASC']],
    });
  }

  async createWorklogMappingRule(
    dto: CreateWorklogMappingRuleDto,
  ): Promise<WorklogMappingRule> {
    await this.findStageById(dto.stageId);
    await this.findStepById(dto.stepId);

    const normalizedKeyword = dto.keyword.trim();
    const existed = await this.worklogMappingRuleRepository.findOne({
      where: {
        projectId: dto.projectId,
        stageId: dto.stageId,
        stepId: dto.stepId,
        keyword: { [Op.iLike]: normalizedKeyword },
      },
    });

    // Idempotent create: if the exact mapping already exists, return it instead of creating duplicate rows.
    if (existed) {
      return existed;
    }

    return this.worklogMappingRuleRepository.create({
      projectId: dto.projectId,
      keyword: normalizedKeyword,
      stageId: dto.stageId,
      stepId: dto.stepId,
      priority: dto.priority ?? 100,
      isActive: dto.isActive ?? true,
    } as any);
  }

  async updateWorklogMappingRule(
    id: number,
    dto: UpdateWorklogMappingRuleDto,
  ): Promise<WorklogMappingRule> {
    const rule = await this.worklogMappingRuleRepository.findByPk(id);
    if (!rule) {
      throw new NotFoundException(`Worklog mapping rule with ID ${id} not found`);
    }

    if (dto.stageId) {
      await this.findStageById(dto.stageId);
    }
    if (dto.stepId) {
      await this.findStepById(dto.stepId);
    }

    await rule.update({
      ...dto,
      keyword: dto.keyword?.trim() ?? rule.keyword,
    });

    return rule;
  }

  async deleteWorklogMappingRule(id: number): Promise<void> {
    const rule = await this.worklogMappingRuleRepository.findByPk(id);
    if (!rule) {
      throw new NotFoundException(`Worklog mapping rule with ID ${id} not found`);
    }
    await rule.destroy();
  }



  async aiSuggestWorklogMappingRules(
    projectId: number,
    file: any,
    autoCreate = false,
  ): Promise<any> {
    const csvContent = file.buffer.toString('utf-8');
    const rows = this.parseCsv(csvContent);
    const stages = await this.findAllStages(projectId);
    const steps = await this.stepRepository.findAll({
      where: { stageId: { [Op.in]: stages.map((s) => s.id) }, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    const stageStepPairs = stages.flatMap((stage) =>
      steps
        .filter((step) => step.stageId === stage.id)
        .map((step) => ({ stageId: stage.id, stageName: stage.name, stepId: step.id, stepName: step.name })),
    );

    const workDetails = Array.from(
      new Set(rows.map((r) => (r.workDetail || '').trim()).filter((v) => v.length > 0)),
    ).slice(0, 200);

    let suggestions = await this.aiGenerateKeywordSuggestions(stageStepPairs, workDetails);
    if (suggestions.length === 0) {
      suggestions = this.heuristicKeywordSuggestions(stageStepPairs, workDetails);
    }

    const existingRules = await this.worklogMappingRuleRepository.findAll({ where: { projectId } });
    const exists = new Set(existingRules.map((r) => `${r.keyword.toLowerCase()}|${r.stageId}|${r.stepId}`));

    const deduped = suggestions.filter((s) => {
      const key = `${s.keyword.toLowerCase()}|${s.stageId}|${s.stepId}`;
      if (exists.has(key)) return false;
      exists.add(key);
      return true;
    });

    let created = 0;
    if (autoCreate && deduped.length > 0) {
      for (const s of deduped) {
        await this.worklogMappingRuleRepository.create({
          projectId,
          keyword: s.keyword,
          stageId: s.stageId,
          stepId: s.stepId,
          priority: Math.round(100 * s.confidence),
          isActive: true,
        } as any);
        created += 1;
      }
    }

    return {
      totalWorkDetails: workDetails.length,
      suggestions: deduped,
      created,
      source: process.env.OPENAI_API_KEY ? 'ai_or_fallback' : 'heuristic',
    };
  }

  private async aiGenerateKeywordSuggestions(
    stageStepPairs: Array<{ stageId: number; stageName: string; stepId: number; stepName: string }>,
    workDetails: string[],
  ): Promise<Array<{ keyword: string; stageId: number; stepId: number; confidence: number; reason?: string }>> {
    if (!process.env.OPENAI_API_KEY) return [];

    const prompt = `Given workflow stage-step pairs and work detail samples, propose keyword mapping rules.

StageStepPairs:
${JSON.stringify(stageStepPairs)}

WorkDetails:
${JSON.stringify(workDetails)}

Return ONLY valid JSON array.
Each item: {"keyword": string, "stageId": number, "stepId": number, "confidence": number, "reason": string}.
- confidence in range 0..1
- keyword should be short and reusable`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a workflow mapping assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1400,
      });

      const content = completion.choices?.[0]?.message?.content || '[]';
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) return [];

      const validStageSteps = new Set(stageStepPairs.map((p) => `${p.stageId}|${p.stepId}`));

      return parsed
        .filter((x: any) => typeof x?.keyword === 'string' && Number.isFinite(Number(x?.stageId)) && Number.isFinite(Number(x?.stepId)))
        .map((x: any) => ({
          keyword: x.keyword.trim(),
          stageId: Number(x.stageId),
          stepId: Number(x.stepId),
          confidence: Math.max(0, Math.min(1, Number(x.confidence ?? 0.7))),
          reason: x.reason || 'AI suggestion',
        }))
        .filter((x: any) => x.keyword.length > 1 && validStageSteps.has(`${x.stageId}|${x.stepId}`));
    } catch {
      return [];
    }
  }

  private heuristicKeywordSuggestions(
    stageStepPairs: Array<{ stageId: number; stageName: string; stepId: number; stepName: string }>,
    workDetails: string[],
  ): Array<{ keyword: string; stageId: number; stepId: number; confidence: number; reason?: string }> {
    const candidates = new Map<string, { keyword: string; stageId: number; stepId: number; confidence: number; reason?: string }>();

    for (const detail of workDetails) {
      const normalized = this.normalizeWorkDetailForKeywordMatching(detail);
      const bracketTokens = Array.from(normalized.matchAll(/\[([^\]]+)\]/g))
        .map((m) => m[1].trim())
        .filter((v) => v.length >= 2 && !/^gsl-\d+$/i.test(v));
      const words = normalized
        .replace(/[^\p{L}0-9\s-]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !/^gsl-\d+$/i.test(w))
        .slice(0, 10);
      const tokens = [...new Set([...bracketTokens, ...words])];

      if (tokens.length === 0) continue;

      const target = this.bestStageStepByText(stageStepPairs, normalized);
      if (!target) continue;

      for (const token of tokens.slice(0, 4)) {
        const key = `${token}|${target.stageId}|${target.stepId}`;
        if (!candidates.has(key)) {
          candidates.set(key, {
            keyword: token,
            stageId: target.stageId,
            stepId: target.stepId,
            confidence: 0.55,
            reason: 'Heuristic from workDetail tokens',
          });
        }
      }

      const comboCandidates: string[] = [];
      for (let i = 0; i < Math.min(tokens.length, 4); i++) {
        for (let j = i + 1; j < Math.min(tokens.length, 5); j++) {
          comboCandidates.push(`${tokens[i]}+${tokens[j]}`);
        }
      }

      for (const combo of comboCandidates.slice(0, 6)) {
        const key = `${combo}|${target.stageId}|${target.stepId}`;
        if (!candidates.has(key)) {
          candidates.set(key, {
            keyword: combo,
            stageId: target.stageId,
            stepId: target.stepId,
            confidence: 0.65,
            reason: 'Heuristic combined keywords',
          });
        }
      }
    }

    return Array.from(candidates.values()).slice(0, 80);
  }

  private bestStageStepByText(
    stageStepPairs: Array<{ stageId: number; stageName: string; stepId: number; stepName: string }>,
    text: string,
  ): { stageId: number; stepId: number } | null {
    let best: { stageId: number; stepId: number; score: number } | null = null;

    for (const pair of stageStepPairs) {
      let score = 0;
      const stageName = pair.stageName.toLowerCase();
      const stepName = pair.stepName.toLowerCase();
      if (text.includes(stageName)) score += 2;
      if (text.includes(stepName)) score += 3;

      const stageWords = stageName.split(/\s+/).filter((w) => w.length > 2);
      const stepWords = stepName.split(/\s+/).filter((w) => w.length > 2);
      score += stageWords.filter((w) => text.includes(w)).length * 0.4;
      score += stepWords.filter((w) => text.includes(w)).length * 0.8;

      if (!best || score > best.score) {
        best = { stageId: pair.stageId, stepId: pair.stepId, score };
      }
    }

    return best && best.score > 0 ? { stageId: best.stageId, stepId: best.stepId } : null;
  }


  private normalizeWorkDetailForKeywordMatching(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/\bgsl-\d+\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findBestMappingRule(
    rules: WorklogMappingRule[],
    workDetail: string,
  ): WorklogMappingRule | undefined {
    const normalizedDetail = this.normalizeWorkDetailForKeywordMatching(workDetail);
    if (!normalizedDetail) return undefined;

    let best: { rule: WorklogMappingRule; score: number } | null = null;

    for (const rule of rules) {
      const rawKeyword = (rule.keyword || '').trim().toLowerCase();
      if (!rawKeyword) continue;

      const terms = rawKeyword
        .split('+')
        .map((term) => term.trim())
        .filter((term) => term.length > 0 && !/^gsl-\d+$/i.test(term));

      if (terms.length === 0) continue;

      const allMatched = terms.every((term) => normalizedDetail.includes(term));
      if (!allMatched) continue;

      const score = terms.length * 10 + Math.min(8, rawKeyword.length / 8);
      if (!best || score > best.score) {
        best = { rule, score };
      }
    }

    return best?.rule;
  }


  // ===== Worklog Import Methods =====

  async previewWorklogImport(projectId: number, file: any): Promise<any> {
    const csvContent = file.buffer.toString('utf-8');
    const rows = this.parseCsv(csvContent);
    if (rows.length === 0) {
      throw new BadRequestException('CSV has no data');
    }

    const requiredColumns = ['day', 'fullName', 'email', 'phase_name', 'workDetail', 'workTime', 'minutes'];
    const headers = Object.keys(rows[0]);
    const missing = requiredColumns.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
      throw new BadRequestException(`Missing required columns: ${missing.join(', ')}`);
    }

    const project = await this.projectService.findOne(projectId);
    const workingHoursPerDay = project?.settings?.workingHoursPerDay || 8;

    const members = await Member.findAll({ where: { projectId } });
    const memberByEmail = new Map(members.map((m) => [(m.email || '').toLowerCase(), m]));

    const rules = await this.worklogMappingRuleRepository.findAll({
      where: { projectId, isActive: true },
      order: [['priority', 'DESC'], ['id', 'ASC']],
    });

    const screenFunctions = await this.screenFunctionRepository.findAll({ where: { projectId } });

    const batch = await this.worklogImportBatchRepository.create({
      projectId,
      sourceFileName: file.originalname || 'worklog.csv',
    } as any);

    const itemsToCreate: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawDay = row.day?.trim();
      const day = this.normalizeDate(rawDay);
      const fullName = row.fullName?.trim();
      const email = row.email?.trim().toLowerCase();
      const phaseName = row.phase_name?.trim();
      const workDetail = row.workDetail?.trim();
      const workTime = row.workTime?.trim();
      const minutesRaw = row.minutes?.trim();

      const minutes = Number(minutesRaw) || this.parseWorkTimeToMinutes(workTime);
      const effortHours = Number((minutes / 60).toFixed(2));
      const effortDays = Number((effortHours / workingHoursPerDay).toFixed(3));

      const member = email ? memberByEmail.get(email) : undefined;

      const matchedRule = this.findBestMappingRule(rules, workDetail || '');

      const screenFunction = this.findScreenFunction(screenFunctions, workDetail || '');

      const confidence = this.calculateConfidence({
        hasMember: !!member,
        hasRule: !!matchedRule,
        hasScreenFunction: !!screenFunction,
      });

      let status = 'unmapped';
      let reason = '';
      if (!member) {
        reason = 'Member email is not in this project';
      } else if (!matchedRule) {
        status = 'needs_review';
        reason = 'No stage/step mapping rule matched';
      } else if (!screenFunction) {
        status = 'needs_review';
        reason = 'No screen function matched from workDetail';
      } else {
        status = 'ready';
      }

      if (rawDay && !day) {
        status = 'needs_review';
        reason = reason
          ? `${reason}; Invalid day format: ${rawDay}`
          : `Invalid day format: ${rawDay}`;
      }

      itemsToCreate.push({
        batchId: batch.id,
        rowNumber: i + 2,
        rawRow: row,
        day,
        fullName,
        email,
        phaseName,
        workDetail,
        workTime,
        minutes,
        effortHours,
        effortDays,
        memberId: member?.id,
        stageId: matchedRule?.stageId,
        stepId: matchedRule?.stepId,
        screenFunctionId: screenFunction?.id,
        confidence,
        status,
        isSelected: status === 'ready',
        reason,
      });
    }

    await this.worklogImportItemRepository.bulkCreate(itemsToCreate as any[]);

    return this.getWorklogImportBatch(batch.id);
  }

  async getWorklogImportBatch(batchId: number): Promise<any> {
    const batch = await this.worklogImportBatchRepository.findByPk(batchId);
    if (!batch) {
      throw new NotFoundException(`Worklog import batch with ID ${batchId} not found`);
    }

    const items = await this.worklogImportItemRepository.findAll({
      where: { batchId },
      include: [
        { model: Member, as: 'member' },
        { model: WorkflowStage, as: 'stage' },
        { model: WorkflowStep, as: 'step' },
        { model: ScreenFunction, as: 'screenFunction' },
      ],
      order: [['rowNumber', 'ASC']],
    });

    const summary = {
      total: items.length,
      ready: items.filter((i) => i.status === 'ready').length,
      needsReview: items.filter((i) => i.status === 'needs_review').length,
      unmapped: items.filter((i) => i.status === 'unmapped').length,
      selected: items.filter((i) => i.isSelected).length,
    };

    return {
      batch,
      summary,
      items,
    };
  }

  async commitWorklogImport(dto: CommitWorklogImportDto): Promise<any> {
    const batch = await this.worklogImportBatchRepository.findByPk(dto.batchId);
    if (!batch) {
      throw new NotFoundException(`Worklog import batch with ID ${dto.batchId} not found`);
    }

    const selectedSet = new Set(dto.selectedItemIds || []);
    const overridesMap = new Map<number, WorklogImportOverrideItemDto>(
      (dto.overrides || []).map((o) => [o.itemId, o]),
    );
    const items = await this.worklogImportItemRepository.findAll({ where: { batchId: dto.batchId } });

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of items) {
      const isSelected = selectedSet.has(item.id);
      await item.update({ isSelected });

      if (!isSelected) {
        await item.update({ status: 'skipped', reason: item.reason || 'Not selected by user' });
        skipped += 1;
        continue;
      }

      const override = overridesMap.get(item.id);
      if (override) {
        const updatePayload: any = {};

        if (override.stepId) {
          const step = await this.findStepById(override.stepId);
          updatePayload.stepId = step.id;
          updatePayload.stageId = step.stageId;
        } else if (override.stageId) {
          await this.findStageById(override.stageId);
          updatePayload.stageId = override.stageId;
        }

        if (override.screenFunctionId) {
          const sf = await this.screenFunctionRepository.findByPk(override.screenFunctionId);
          if (!sf || sf.projectId !== batch.projectId) {
            await item.update({ status: 'error', reason: 'Invalid screen function override' });
            failed += 1;
            continue;
          }
          updatePayload.screenFunctionId = sf.id;
        }

        if (Object.keys(updatePayload).length > 0) {
          await item.update(updatePayload);
        }
      }

      if (!item.memberId || !item.stepId || !item.screenFunctionId) {
        await item.update({ status: 'error', reason: 'Missing mapping data for commit' });
        failed += 1;
        continue;
      }

      try {
        const [stepScreenFunction] = await this.stepScreenFunctionRepository.findOrCreate({
          where: {
            stepId: item.stepId,
            screenFunctionId: item.screenFunctionId,
          },
          defaults: {
            stepId: item.stepId,
            screenFunctionId: item.screenFunctionId,
            actualEffort: item.effortHours || 0,
          } as any,
        });

        const [assignment, created] = await this.stepScreenFunctionMemberRepository.findOrCreate({
          where: {
            stepScreenFunctionId: stepScreenFunction.id,
            memberId: item.memberId,
          },
          defaults: {
            stepScreenFunctionId: stepScreenFunction.id,
            memberId: item.memberId,
            actualEffort: item.effortHours || 0,
            note: item.workDetail,
            actualStartDate: item.day,
            actualEndDate: item.day,
          } as any,
        });

        if (!created) {
          await assignment.update({
            actualEffort: Number((Number(assignment.actualEffort || 0) + Number(item.effortHours || 0)).toFixed(2)),
            note: [assignment.note, `${item.day || ''}: ${item.workDetail || ''}`].filter(Boolean).join('\n'),
            actualStartDate: assignment.actualStartDate || item.day,
            actualEndDate: item.day || assignment.actualEndDate,
          });
        }

        await stepScreenFunction.update({
          actualEffort: Number((Number(stepScreenFunction.actualEffort || 0) + Number(item.effortHours || 0)).toFixed(2)),
          status: 'In Progress',
        });

        await item.update({ status: 'committed', reason: null as any });
        success += 1;
      } catch (error: any) {
        await item.update({ status: 'error', reason: error?.message || 'Commit failed' });
        failed += 1;
      }
    }

    return { batchId: dto.batchId, success, failed, skipped, total: items.length };
  }

  async exportUnselectedWorklogImport(batchId: number): Promise<string> {
    const items = await this.worklogImportItemRepository.findAll({
      where: {
        batchId,
        [Op.or]: [{ isSelected: false }, { status: 'error' }, { status: 'unmapped' }, { status: 'needs_review' }, { status: 'skipped' }],
      },
      order: [['rowNumber', 'ASC']],
    });

    const headers = ['day', 'fullName', 'email', 'phase_name', 'workDetail', 'workTime', 'minutes', 'status', 'reason'];
    const lines = [headers.join(',')];

    for (const item of items) {
      const row = [
        item.day || '',
        item.fullName || '',
        item.email || '',
        item.phaseName || '',
        item.workDetail || '',
        item.workTime || '',
        item.minutes?.toString() || '',
        item.status || '',
        item.reason || '',
      ].map((v) => this.escapeCsv(v));
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  private parseWorkTimeToMinutes(workTime?: string): number {
    if (!workTime) return 0;
    const m = workTime.match(/^(\d+):(\d{1,2})$/);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  private calculateConfidence(input: { hasMember: boolean; hasRule: boolean; hasScreenFunction: boolean }): number {
    let score = 0;
    if (input.hasMember) score += 0.4;
    if (input.hasRule) score += 0.35;
    if (input.hasScreenFunction) score += 0.25;
    return Number(score.toFixed(2));
  }

  private findScreenFunction(screenFunctions: ScreenFunction[], workDetail: string): ScreenFunction | undefined {
    const text = workDetail.toLowerCase();
    const ticketMatch = workDetail.match(/[A-Za-z]+-\d+/);
    if (ticketMatch) {
      const ticket = ticketMatch[0].toLowerCase();
      const byTicket = screenFunctions.find((sf) =>
        (sf.name || '').toLowerCase().includes(ticket) ||
        (sf.description || '').toLowerCase().includes(ticket),
      );
      if (byTicket) return byTicket;
    }

    return screenFunctions.find((sf) => {
      const name = (sf.name || '').toLowerCase();
      return name.length > 4 && text.includes(name);
    });
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private parseCsv(content: string): Array<Record<string, string>> {
    const rows = this.parseCsvRows(content);
    if (rows.length < 2) return [];

    const headers = rows[0].map((header) => header.trim());
    const dataRows: Array<Record<string, string>> = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim();
      });

      if (Object.values(row).some((value) => value !== '')) {
        dataRows.push(row);
      }
    }

    return dataRows;
  }

  private parseCsvRows(content: string): string[][] {
    const text = content.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentValue);
        currentValue = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          i++;
        }

        currentRow.push(currentValue);
        currentValue = '';

        if (currentRow.some((value) => value !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentValue += char;
      }
    }

    currentRow.push(currentValue);
    if (currentRow.some((value) => value !== '')) {
      rows.push(currentRow);
    }

    return rows;
  }
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map((v) => v.trim());
  }

  private normalizeDate(value?: string): string | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00Z`);
      return Number.isNaN(d.getTime()) ? null : `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const dd = slashMatch[1];
      const mm = slashMatch[2];
      const yyyy = slashMatch[3];
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
      return Number.isNaN(d.getTime()) ? null : `${yyyy}-${mm}-${dd}`;
    }

    return null;
  }


}
