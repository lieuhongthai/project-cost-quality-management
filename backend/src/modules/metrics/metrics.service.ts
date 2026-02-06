import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Metrics } from './metrics.model';
import { ProjectService } from '../project/project.service';
import { MemberService } from '../member/member.service';
import { WorkflowStage } from '../task-workflow/workflow-stage.model';
import { WorkflowStep } from '../task-workflow/workflow-step.model';
import { StepScreenFunction } from '../task-workflow/step-screen-function.model';
import { StepScreenFunctionMember } from '../task-workflow/step-screen-function-member.model';
import { ScreenFunction } from '../screen-function/screen-function.model';
import { Member } from '../member/member.model';
import { TaskMemberMetric } from '../task-workflow/task-member-metric.model';
import { MetricCategory } from '../task-workflow/metric-category.model';
import { MetricType } from '../task-workflow/metric-type.model';
import { Op } from 'sequelize';

export interface ScheduleMetricsInput {
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
}

export interface TestingMetricsInput {
  totalTestCases: number;
  defectsDetected: number;
}

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRICS_REPOSITORY')
    private metricsRepository: typeof Metrics,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
    @Inject(forwardRef(() => MemberService))
    private memberService: MemberService,
  ) {}

  calculateScheduleMetrics(input: ScheduleMetricsInput) {
    const { estimatedEffort, actualEffort, progress } = input;

    // Budget at Completion (BAC) = Total Estimated Effort
    const budgetAtCompletion = estimatedEffort;

    // Earned Value (EV) = Estimated Effort * Progress
    const earnedValue = estimatedEffort * (progress / 100);

    // Planned Value (PV) = Estimated Effort (assuming we should be done by now)
    const plannedValue = estimatedEffort;

    // Actual Cost (AC) = Actual Effort
    const actualCost = actualEffort;

    // Schedule Performance Index (SPI) = EV / PV
    const spi = plannedValue > 0 ? earnedValue / plannedValue : 0;

    // Cost Performance Index (CPI) = EV / AC
    const cpi = actualCost > 0 ? earnedValue / actualCost : 0;

    // Estimate at Completion (EAC) = AC + (BAC - EV) / CPI
    // If CPI is 0 or very small, use BAC as fallback
    let estimateAtCompletion = budgetAtCompletion;
    if (cpi > 0.01) {
      estimateAtCompletion = actualCost + (budgetAtCompletion - earnedValue) / cpi;
    } else if (actualCost > 0) {
      // If no CPI yet but we have actual cost, estimate based on current progress
      estimateAtCompletion = progress > 0 ? (actualCost / progress) * 100 : budgetAtCompletion;
    }

    // Variance at Completion (VAC) = BAC - EAC
    // Positive = Under budget, Negative = Over budget
    const varianceAtCompletion = budgetAtCompletion - estimateAtCompletion;

    // To Complete Performance Index (TCPI) = (BAC - EV) / (BAC - AC)
    // TCPI > 1 means need to work more efficiently to meet budget
    const remainingWork = budgetAtCompletion - earnedValue;
    const remainingBudget = budgetAtCompletion - actualCost;
    const toCompletePerformanceIndex = remainingBudget > 0
      ? remainingWork / remainingBudget
      : remainingWork > 0 ? Infinity : 1;

    // Delay Rate (%)
    const delayRate = progress < 100 && actualEffort > estimatedEffort
      ? ((actualEffort - estimatedEffort) / estimatedEffort) * 100
      : 0;

    // Delay in Man-Months
    const delayInManMonths = actualEffort - estimatedEffort;

    // Estimate vs Actual ratio
    const estimatedVsActual = estimatedEffort > 0
      ? actualEffort / estimatedEffort
      : 0;

    return {
      schedulePerformanceIndex: spi,
      costPerformanceIndex: cpi,
      plannedValue,
      earnedValue,
      actualCost,
      budgetAtCompletion,
      estimateAtCompletion,
      varianceAtCompletion,
      toCompletePerformanceIndex: Number.isFinite(toCompletePerformanceIndex) ? toCompletePerformanceIndex : 999,
      delayRate,
      delayInManMonths,
      estimatedVsActual,
    };
  }

  calculateTestingMetrics(input: TestingMetricsInput) {
    const {
      totalTestCases,
      defectsDetected,
    } = input;

    // Defect Rate (defects per test case)
    const defectRate = totalTestCases > 0 
      ? defectsDetected / totalTestCases 
      : 0;

    return {
      defectRate,
    };
  }

  /**
   * Aggregate real testing data from TaskMemberMetric for given stage IDs.
   * Only uses MetricType "Test Cases" with categories: "Total", "Passed", "Failed".
   * Returns per-stage and project-level totals.
   */
  async getTestingDataForStages(stageIds: number[]): Promise<{
    byStage: Map<number, { totalTestCases: number; passedTestCases: number; failedTestCases: number }>;
    project: { totalTestCases: number; passedTestCases: number; failedTestCases: number };
  }> {
    const byStage = new Map<number, { totalTestCases: number; passedTestCases: number; failedTestCases: number }>();
    const project = { totalTestCases: 0, passedTestCases: 0, failedTestCases: 0 };

    if (stageIds.length === 0) return { byStage, project };

    // Get all steps in the stages
    const steps = await WorkflowStep.findAll({
      where: { stageId: { [Op.in]: stageIds }, isActive: true },
    });
    const stepIds = steps.map(s => s.id);
    if (stepIds.length === 0) return { byStage, project };

    const stepToStageMap = new Map<number, number>();
    for (const step of steps) {
      stepToStageMap.set(step.id, step.stageId);
    }

    // Get all step-screen-functions
    const ssfs = await StepScreenFunction.findAll({
      where: { stepId: { [Op.in]: stepIds } },
    });
    const ssfIds = ssfs.map(s => s.id);
    if (ssfIds.length === 0) return { byStage, project };

    const ssfToStepMap = new Map<number, number>();
    for (const ssf of ssfs) {
      ssfToStepMap.set(ssf.id, ssf.stepId);
    }

    // Get all members
    const members = await StepScreenFunctionMember.findAll({
      where: { stepScreenFunctionId: { [Op.in]: ssfIds } },
    });
    const memberIds = members.map(m => m.id);
    if (memberIds.length === 0) return { byStage, project };

    const memberToSsfMap = new Map<number, number>();
    for (const member of members) {
      memberToSsfMap.set(member.id, member.stepScreenFunctionId);
    }

    // Get only "Test Cases" metrics with category and type
    const metrics = await TaskMemberMetric.findAll({
      where: { stepScreenFunctionMemberId: { [Op.in]: memberIds } },
      include: [{
        model: MetricCategory,
        as: 'metricCategory',
        include: [{
          model: MetricType,
          as: 'metricType',
        }],
      }],
    });

    // Initialize byStage
    for (const stageId of stageIds) {
      byStage.set(stageId, { totalTestCases: 0, passedTestCases: 0, failedTestCases: 0 });
    }

    // Aggregate only "Test Cases" metrics
    for (const metric of metrics) {
      const category = metric.metricCategory;
      if (!category?.metricType) continue;

      const typeName = category.metricType.name.trim().toLowerCase();
      if (typeName !== 'test cases') continue;

      const catName = category.name.trim().toLowerCase();

      // Resolve stage
      const ssfId = memberToSsfMap.get(metric.stepScreenFunctionMemberId);
      if (!ssfId) continue;
      const stepId = ssfToStepMap.get(ssfId);
      if (!stepId) continue;
      const stageId = stepToStageMap.get(stepId);
      if (!stageId || !byStage.has(stageId)) continue;

      const stageTotals = byStage.get(stageId)!;
      const value = metric.value || 0;

      if (catName === 'total') {
        stageTotals.totalTestCases += value;
        project.totalTestCases += value;
      } else if (catName === 'passed') {
        stageTotals.passedTestCases += value;
        project.passedTestCases += value;
      } else if (catName === 'failed') {
        stageTotals.failedTestCases += value;
        project.failedTestCases += value;
      }
    }

    return { byStage, project };
  }

  async calculateStageMetrics(stageId: number, reportId: number): Promise<Metrics> {
    const stage = await WorkflowStage.findByPk(stageId);
    if (!stage) {
      throw new Error(`Stage with ID ${stageId} not found`);
    }
    // Use stage's actualEffort and progress directly (updated from StepScreenFunction)
    // This ensures consistency between what's displayed in the UI and what's in the report
    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: stage.estimatedEffort,
      actualEffort: stage.actualEffort || 0,
      progress: stage.progress || 0,
    });

    // Get real testing data from TaskMemberMetric
    const testingData = await this.getTestingDataForStages([stageId]);
    const stageTestData = testingData.byStage.get(stageId) || { totalTestCases: 0, failedTestCases: 0 };

    const testingMetrics = this.calculateTestingMetrics({
      totalTestCases: stageTestData.totalTestCases,
      defectsDetected: stageTestData.failedTestCases,
    });

    return this.metricsRepository.create({
      reportId,
      ...scheduleMetrics,
      ...testingMetrics,
    } as any);
  }

  async calculateProjectMetrics(projectId: number, reportId: number): Promise<Metrics> {
    const project = await this.projectService.findOne(projectId);
    const stages = await WorkflowStage.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    // Get real testing data from TaskMemberMetric across all stages
    const stageIds = stages.map(s => s.id);
    const testingData = await this.getTestingDataForStages(stageIds);

    // Use project's data directly (updated from stages)
    // This ensures consistency between what's displayed in the UI and what's in the report
    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: project.estimatedEffort,
      actualEffort: project.actualEffort || 0,
      progress: project.progress || 0,
    });

    const testingMetrics = this.calculateTestingMetrics({
      totalTestCases: testingData.project.totalTestCases,
      defectsDetected: testingData.project.failedTestCases,
    });

    // Auto-update project status based on calculated metrics
    await this.projectService.updateProjectStatus(projectId, {
      schedulePerformanceIndex: scheduleMetrics.schedulePerformanceIndex,
      costPerformanceIndex: scheduleMetrics.costPerformanceIndex,
      delayRate: scheduleMetrics.delayRate,
    });

    return this.metricsRepository.create({
      reportId,
      ...scheduleMetrics,
      ...testingMetrics,
    } as any);
  }

  async findByReport(reportId: number): Promise<Metrics[]> {
    return this.metricsRepository.findAll({
      where: { reportId },
    });
  }

  async findOne(id: number): Promise<Metrics> {
    return this.metricsRepository.findByPk(id);
  }

  /**
   * Get real-time metrics for a project without creating a report
   * This calculates metrics on-the-fly based on current data
   */
  async getProjectRealTimeMetrics(projectId: number) {
    const project = await this.projectService.findOne(projectId);
    const stages = await WorkflowStage.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    // Get real testing data from TaskMemberMetric
    const stageIds = stages.map(s => s.id);
    const testingData = await this.getTestingDataForStages(stageIds);

    // Calculate schedule metrics
    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: project.estimatedEffort,
      actualEffort: project.actualEffort || 0,
      progress: project.progress || 0,
    });

    // Calculate testing metrics from real data
    const testingMetrics = this.calculateTestingMetrics({
      totalTestCases: testingData.project.totalTestCases,
      defectsDetected: testingData.project.failedTestCases,
    });

    // Evaluate status based on metrics
    const evaluatedStatus = this.projectService.evaluateProjectStatus({
      schedulePerformanceIndex: scheduleMetrics.schedulePerformanceIndex,
      costPerformanceIndex: scheduleMetrics.costPerformanceIndex,
      delayRate: scheduleMetrics.delayRate,
    });

    // Determine status reasons
    const statusReasons = this.getStatusReasons({
      spi: scheduleMetrics.schedulePerformanceIndex,
      cpi: scheduleMetrics.costPerformanceIndex,
      delayRate: scheduleMetrics.delayRate,
    });

    return {
      projectId,
      currentStatus: project.status,
      evaluatedStatus,
      statusReasons,
      schedule: {
        estimatedEffort: project.estimatedEffort,
        actualEffort: project.actualEffort || 0,
        progress: project.progress || 0,
        spi: scheduleMetrics.schedulePerformanceIndex,
        cpi: scheduleMetrics.costPerformanceIndex,
        delayRate: scheduleMetrics.delayRate,
        delayInManMonths: scheduleMetrics.delayInManMonths,
        plannedValue: scheduleMetrics.plannedValue,
        earnedValue: scheduleMetrics.earnedValue,
        actualCost: scheduleMetrics.actualCost,
      },
      forecasting: {
        bac: scheduleMetrics.budgetAtCompletion,
        eac: scheduleMetrics.estimateAtCompletion,
        vac: scheduleMetrics.varianceAtCompletion,
        tcpi: scheduleMetrics.toCompletePerformanceIndex,
      },
      testing: {
        defectRate: testingMetrics.defectRate,
      },
      stages: stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        progress: stage.progress,
        status: stage.status,
      })),
    };
  }

  /**
   * Get human-readable reasons for the current status
   * Simplified to focus on Efficiency (CPI)
   */
  private getStatusReasons(metrics: {
    spi: number;
    cpi: number;
    delayRate: number;
  }): Array<{
    type: 'good' | 'warning' | 'risk';
    metricKey: 'efficiency';
    messageKey: string;
    value: number;
    data?: Record<string, number>;
  }> {
    const reasons: Array<{
      type: 'good' | 'warning' | 'risk';
      metricKey: 'efficiency';
      messageKey: string;
      value: number;
      data?: Record<string, number>;
    }> = [];

    // Efficiency evaluation (CPI) - Main metric
    // CPI = Expected Effort / Actual Effort
    // CPI >= 1.0 means actual ≤ expected (efficient)
    // CPI < 1.0 means actual > expected (over budget)
    const efficiencyPercent = Math.round(metrics.cpi * 100);

    if (metrics.cpi >= 1.0) {
      reasons.push({
        type: 'good',
        metricKey: 'efficiency',
        value: efficiencyPercent,
        messageKey: 'efficiencyGood',
        data: { efficiencyPercent }
      });
    } else if (metrics.cpi >= 0.83) {
      const overBudgetPercent = Math.round((1 / metrics.cpi - 1) * 100);
      reasons.push({
        type: 'warning',
        metricKey: 'efficiency',
        value: efficiencyPercent,
        messageKey: 'efficiencyWarning',
        data: { efficiencyPercent, overBudgetPercent }
      });
    } else if (metrics.cpi > 0) {
      const overBudgetPercent = Math.round((1 / metrics.cpi - 1) * 100);
      reasons.push({
        type: 'risk',
        metricKey: 'efficiency',
        value: efficiencyPercent,
        messageKey: 'efficiencyRisk',
        data: { efficiencyPercent, overBudgetPercent }
      });
    } else {
      reasons.push({
        type: 'good',
        metricKey: 'efficiency',
        value: 0,
        messageKey: 'efficiencyNoData',
      });
    }

    return reasons;
  }

  /**
   * Update project status based on real-time metrics and return updated data
   */
  async refreshProjectStatus(projectId: number) {
    const metrics = await this.getProjectRealTimeMetrics(projectId);

    // Update project status if different
    if (metrics.currentStatus !== metrics.evaluatedStatus) {
      await this.projectService.updateProjectStatus(projectId, {
        schedulePerformanceIndex: metrics.schedule.spi,
        costPerformanceIndex: metrics.schedule.cpi,
        delayRate: metrics.schedule.delayRate,
      });
      metrics.currentStatus = metrics.evaluatedStatus;
    }

    return metrics;
  }

  /**
   * Get productivity metrics for a project
   * Analyzes effort per member, role, and stage
   */
  async getProjectProductivityMetrics(projectId: number) {
    const project = await this.projectService.findOne(projectId);
    const members = await this.memberService.findByProject(projectId);
    const stages = await WorkflowStage.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    const stageIds = stages.map(stage => stage.id);
    const steps = await WorkflowStep.findAll({
      where: { stageId: { [Op.in]: stageIds }, isActive: true },
      order: [['displayOrder', 'ASC']],
    });
    const stepIds = steps.map(step => step.id);
    const stepToStageMap = new Map<number, number>();
    for (const step of steps) {
      stepToStageMap.set(step.id, step.stageId);
    }

    const stepScreenFunctions = await StepScreenFunction.findAll({
      where: { stepId: { [Op.in]: stepIds } },
      include: [
        { model: WorkflowStep, as: 'step' },
        { model: ScreenFunction, as: 'screenFunction' },
        { model: StepScreenFunctionMember, as: 'members', include: [{ model: Member, as: 'member' }] },
      ],
    });

    // Collect all step screen functions across stages
    const memberStats = new Map<number, {
      memberId: number;
      name: string;
      role: string;
      totalEstimated: number;
      totalActual: number;
      tasksCompleted: number;
      tasksTotal: number;
      efficiency: number;
    }>();

    const roleStats = new Map<string, {
      role: string;
      totalEstimated: number;
      totalActual: number;
      tasksCompleted: number;
      tasksTotal: number;
      memberCount: number;
      efficiency: number;
    }>();

    const stageStats: Array<{
      stageId: number;
      stageName: string;
      totalEstimated: number;
      totalActual: number;
      tasksCompleted: number;
      tasksTotal: number;
      efficiency: number;
      progress: number;
    }> = [];

    // Initialize member stats
    for (const member of members) {
      memberStats.set(member.id, {
        memberId: member.id,
        name: member.name,
        role: member.role,
        totalEstimated: 0,
        totalActual: 0,
        tasksCompleted: 0,
        tasksTotal: 0,
        efficiency: 0,
      });

      // Initialize role stats
      if (!roleStats.has(member.role)) {
        roleStats.set(member.role, {
          role: member.role,
          totalEstimated: 0,
          totalActual: 0,
          tasksCompleted: 0,
          tasksTotal: 0,
          memberCount: 0,
          efficiency: 0,
        });
      }
      roleStats.get(member.role)!.memberCount++;
    }

    const stageTotals = new Map<number, {
      totalEstimated: number;
      totalActual: number;
      tasksCompleted: number;
      tasksTotal: number;
    }>();

    for (const stage of stages) {
      stageTotals.set(stage.id, {
        totalEstimated: 0,
        totalActual: 0,
        tasksCompleted: 0,
        tasksTotal: 0,
      });
    }

    for (const ssf of stepScreenFunctions) {
      if (ssf.status === 'Skipped') continue;
      const stageId = stepToStageMap.get(ssf.stepId);
      if (!stageId || !stageTotals.has(stageId)) continue;

      const stageTotalsEntry = stageTotals.get(stageId)!;
      stageTotalsEntry.totalEstimated += ssf.estimatedEffort || 0;
      stageTotalsEntry.totalActual += ssf.actualEffort || 0;
      stageTotalsEntry.tasksTotal++;
      if (ssf.status === 'Completed') stageTotalsEntry.tasksCompleted++;

      for (const memberEntry of ssf.members || []) {
        const memberId = memberEntry.memberId;
        if (!memberStats.has(memberId)) continue;
        const mStats = memberStats.get(memberId)!;
        mStats.totalEstimated += memberEntry.estimatedEffort || 0;
        mStats.totalActual += memberEntry.actualEffort || 0;
        mStats.tasksTotal++;
        if ((memberEntry.progress || 0) >= 100) mStats.tasksCompleted++;

        const member = members.find(m => m.id === memberId);
        if (member && roleStats.has(member.role)) {
          const rStats = roleStats.get(member.role)!;
          rStats.totalEstimated += memberEntry.estimatedEffort || 0;
          rStats.totalActual += memberEntry.actualEffort || 0;
          rStats.tasksTotal++;
          if ((memberEntry.progress || 0) >= 100) rStats.tasksCompleted++;
        }
      }
    }

    for (const stage of stages) {
      const totals = stageTotals.get(stage.id)!;
      const stageEV = totals.totalEstimated * (stage.progress / 100);
      const stageEfficiency = totals.totalActual > 0 ? stageEV / totals.totalActual : 0;

      stageStats.push({
        stageId: stage.id,
        stageName: stage.name,
        totalEstimated: totals.totalEstimated,
        totalActual: totals.totalActual,
        tasksCompleted: totals.tasksCompleted,
        tasksTotal: totals.tasksTotal,
        efficiency: Math.round(stageEfficiency * 100) / 100,
        progress: stage.progress,
      });
    }

    // Calculate efficiency for each member
    const memberProductivity: Array<{
      memberId: number;
      name: string;
      role: string;
      totalEstimated: number;
      totalActual: number;
      tasksCompleted: number;
      tasksTotal: number;
      efficiency: number;
      completionRate: number;
    }> = [];

    for (const [memberId, stats] of memberStats) {
      // Efficiency = EV / AC where EV = Estimated * (Completed/Total)
      const completionRate = stats.tasksTotal > 0 ? stats.tasksCompleted / stats.tasksTotal : 0;
      const ev = stats.totalEstimated * completionRate;
      const efficiency = stats.totalActual > 0 ? ev / stats.totalActual : (stats.tasksCompleted > 0 ? 1 : 0);

      memberProductivity.push({
        ...stats,
        efficiency: Math.round(efficiency * 100) / 100,
        completionRate: Math.round(completionRate * 100),
      });
    }

    // Sort by efficiency (highest first)
    memberProductivity.sort((a, b) => b.efficiency - a.efficiency);

    // Calculate role efficiency
    const roleProductivity: Array<{
      role: string;
      totalEstimated: number;
      totalActual: number;
      tasksCompleted: number;
      tasksTotal: number;
      memberCount: number;
      efficiency: number;
      avgEffortPerTask: number;
    }> = [];

    for (const [role, stats] of roleStats) {
      const completionRate = stats.tasksTotal > 0 ? stats.tasksCompleted / stats.tasksTotal : 0;
      const ev = stats.totalEstimated * completionRate;
      const efficiency = stats.totalActual > 0 ? ev / stats.totalActual : (stats.tasksCompleted > 0 ? 1 : 0);
      const avgEffortPerTask = stats.tasksCompleted > 0 ? stats.totalActual / stats.tasksCompleted : 0;

      roleProductivity.push({
        ...stats,
        efficiency: Math.round(efficiency * 100) / 100,
        avgEffortPerTask: Math.round(avgEffortPerTask * 100) / 100,
      });
    }

    // Sort roles by efficiency
    roleProductivity.sort((a, b) => b.efficiency - a.efficiency);

    // Overall project productivity
    const totalEstimated = stageStats.reduce((sum, p) => sum + p.totalEstimated, 0);
    const totalActual = stageStats.reduce((sum, p) => sum + p.totalActual, 0);
    const tasksCompleted = stageStats.reduce((sum, p) => sum + p.tasksCompleted, 0);
    const tasksTotal = stageStats.reduce((sum, p) => sum + p.tasksTotal, 0);
    const projectEV = totalEstimated * (project.progress / 100);
    const projectEfficiency = totalActual > 0 ? projectEV / totalActual : 0;

    return {
      projectId,
      projectName: project.name,
      summary: {
        totalEstimated,
        totalActual,
        variance: totalActual - totalEstimated,
        variancePercent: totalEstimated > 0 ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 100) : 0,
        tasksCompleted,
        tasksTotal,
        completionRate: tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0,
        efficiency: Math.round(projectEfficiency * 100) / 100,
        avgEffortPerTask: tasksCompleted > 0 ? Math.round((totalActual / tasksCompleted) * 100) / 100 : 0,
      },
      byMember: memberProductivity.filter(m => m.tasksTotal > 0),
      byRole: roleProductivity.filter(r => r.tasksTotal > 0),
      byStage: stageStats,
    };
  }

  /**
   * Get member cost analysis for a project
   * Calculates actual cost based on hourly rate and worked hours
   * Only includes members with hourly rate > 0 who have worked on tasks
   */
  async getProjectMemberCostAnalysis(projectId: number) {
    const project = await this.projectService.findOne(projectId);
    const members = await this.memberService.findByProject(projectId);
    const stages = await WorkflowStage.findAll({
      where: { projectId, isActive: true },
      order: [['displayOrder', 'ASC']],
    });

    const stageIds = stages.map(stage => stage.id);
    const steps = await WorkflowStep.findAll({
      where: { stageId: { [Op.in]: stageIds }, isActive: true },
      order: [['displayOrder', 'ASC']],
    });
    const stepIds = steps.map(step => step.id);
    const stepIdToStageId = new Map<number, number>();
    for (const step of steps) {
      stepIdToStageId.set(step.id, step.stageId);
    }

    const stepScreenFunctions = await StepScreenFunction.findAll({
      where: { stepId: { [Op.in]: stepIds } },
      include: [
        { model: WorkflowStep, as: 'step' },
        { model: ScreenFunction, as: 'screenFunction' },
        { model: StepScreenFunctionMember, as: 'members', include: [{ model: Member, as: 'member' }] },
      ],
    });

    // Filter members with hourly rate
    const membersWithRate = members.filter(m => m.hourlyRate && m.hourlyRate > 0);

    if (membersWithRate.length === 0) {
      return null; // No members with hourly rate
    }

    // Map to track member cost details
    const memberCostMap = new Map<number, {
      memberId: number;
      name: string;
      role: string;
      hourlyRate: number;
      tasks: Array<{
        taskId: number;
        taskName: string;
        stageName: string;
        estimatedHours: number;
        actualHours: number;
        estimatedCost: number;
        actualCost: number;
        status: string;
      }>;
      totalEstimatedHours: number;
      totalActualHours: number;
      totalEstimatedCost: number;
      totalActualCost: number;
      efficiency: number;
      efficiencyRating: string;
    }>();

    // Initialize member cost data
    for (const member of membersWithRate) {
      memberCostMap.set(member.id, {
        memberId: member.id,
        name: member.name,
        role: member.role,
        hourlyRate: member.hourlyRate,
        tasks: [],
        totalEstimatedHours: 0,
        totalActualHours: 0,
        totalEstimatedCost: 0,
        totalActualCost: 0,
        efficiency: 0,
        efficiencyRating: 'N/A',
      });
    }

    // Process each step-screen-function and collect task data
    for (const ssf of stepScreenFunctions) {
      if (ssf.status === 'Skipped') continue;
      const stageId = stepIdToStageId.get(ssf.stepId);
      if (!stageId) continue;
      const stage = stages.find(s => s.id === stageId);
      if (!stage) continue;

      for (const memberEntry of ssf.members || []) {
        if (!memberCostMap.has(memberEntry.memberId)) continue;
        const memberData = memberCostMap.get(memberEntry.memberId)!;
        const estimatedHours = memberEntry.estimatedEffort || 0;
        const actualHours = memberEntry.actualEffort || 0;
        const estimatedCost = estimatedHours * memberData.hourlyRate;
        const actualCost = actualHours * memberData.hourlyRate;
        const taskName = ssf.screenFunction?.name
          ? `${ssf.screenFunction.name} - ${ssf.step?.name || 'Step'}`
          : `Task #${ssf.screenFunctionId}`;

        memberData.tasks.push({
          taskId: ssf.id,
          taskName,
          stageName: stage.name,
          estimatedHours,
          actualHours,
          estimatedCost,
          actualCost,
          status: ssf.status,
        });

        memberData.totalEstimatedHours += estimatedHours;
        memberData.totalActualHours += actualHours;
        memberData.totalEstimatedCost += estimatedCost;
        memberData.totalActualCost += actualCost;
      }
    }

    // Calculate efficiency and rating for each member
    const memberCostAnalysis: Array<{
      memberId: number;
      name: string;
      role: string;
      hourlyRate: number;
      tasks: Array<{
        taskId: number;
        taskName: string;
        stageName: string;
        estimatedHours: number;
        actualHours: number;
        estimatedCost: number;
        actualCost: number;
        status: string;
      }>;
      totalEstimatedHours: number;
      totalActualHours: number;
      totalEstimatedCost: number;
      totalActualCost: number;
      costVariance: number;
      costVariancePercent: number;
      efficiency: number;
      efficiencyRating: string;
      efficiencyColor: string;
    }> = [];

    for (const [memberId, data] of memberCostMap) {
      // Only include members who have worked on tasks
      if (data.tasks.length === 0) continue;

      // Calculate efficiency: estimated / actual (>1 = faster, <1 = slower)
      const efficiency = data.totalActualHours > 0
        ? data.totalEstimatedHours / data.totalActualHours
        : data.totalEstimatedHours > 0 ? 0 : 1;

      // Cost variance
      const costVariance = data.totalActualCost - data.totalEstimatedCost;
      const costVariancePercent = data.totalEstimatedCost > 0
        ? Math.round((costVariance / data.totalEstimatedCost) * 100)
        : 0;

      // Efficiency rating
      let efficiencyRating: string;
      let efficiencyColor: string;
      if (efficiency >= 1.2) {
        efficiencyRating = 'Xuất sắc';
        efficiencyColor = 'green';
      } else if (efficiency >= 1.0) {
        efficiencyRating = 'Tốt';
        efficiencyColor = 'blue';
      } else if (efficiency >= 0.8) {
        efficiencyRating = 'Đạt yêu cầu';
        efficiencyColor = 'yellow';
      } else {
        efficiencyRating = 'Cần cải thiện';
        efficiencyColor = 'red';
      }

      memberCostAnalysis.push({
        ...data,
        costVariance,
        costVariancePercent,
        efficiency: Math.round(efficiency * 100) / 100,
        efficiencyRating,
        efficiencyColor,
      });
    }

    // Sort by total actual cost (highest first)
    memberCostAnalysis.sort((a, b) => b.totalActualCost - a.totalActualCost);

    // Calculate totals
    const totalEstimatedCost = memberCostAnalysis.reduce((sum, m) => sum + m.totalEstimatedCost, 0);
    const totalActualCost = memberCostAnalysis.reduce((sum, m) => sum + m.totalActualCost, 0);
    const totalEstimatedHours = memberCostAnalysis.reduce((sum, m) => sum + m.totalEstimatedHours, 0);
    const totalActualHours = memberCostAnalysis.reduce((sum, m) => sum + m.totalActualHours, 0);
    const totalCostVariance = totalActualCost - totalEstimatedCost;
    const totalCostVariancePercent = totalEstimatedCost > 0
      ? Math.round((totalCostVariance / totalEstimatedCost) * 100)
      : 0;

    // Group by stage for stage cost summary
    const stageCostMap = new Map<string, {
      stageName: string;
      estimatedCost: number;
      actualCost: number;
      memberCount: number;
    }>();

    for (const member of memberCostAnalysis) {
      for (const task of member.tasks) {
        if (!stageCostMap.has(task.stageName)) {
          stageCostMap.set(task.stageName, {
            stageName: task.stageName,
            estimatedCost: 0,
            actualCost: 0,
            memberCount: 0,
          });
        }
        const stageData = stageCostMap.get(task.stageName)!;
        stageData.estimatedCost += task.estimatedCost;
        stageData.actualCost += task.actualCost;
      }
    }

    // Count unique members per stage
    for (const member of memberCostAnalysis) {
      const stagesSeen = new Set<string>();
      for (const task of member.tasks) {
        if (!stagesSeen.has(task.stageName)) {
          stagesSeen.add(task.stageName);
          stageCostMap.get(task.stageName)!.memberCount++;
        }
      }
    }

    const stageCostSummary = Array.from(stageCostMap.values()).map(p => ({
      ...p,
      costVariance: p.actualCost - p.estimatedCost,
      costVariancePercent: p.estimatedCost > 0
        ? Math.round(((p.actualCost - p.estimatedCost) / p.estimatedCost) * 100)
        : 0,
    }));

    // Top performers and those needing support
    const topPerformers = memberCostAnalysis
      .filter(m => m.efficiency >= 1.0)
      .slice(0, 3);

    const needSupport = memberCostAnalysis
      .filter(m => m.efficiency < 0.8 && m.totalActualHours > 0)
      .slice(0, 3);

    return {
      projectId,
      projectName: project.name,
      currency: 'USD',
      summary: {
        totalMembers: memberCostAnalysis.length,
        totalEstimatedHours,
        totalActualHours,
        totalEstimatedCost,
        totalActualCost,
        totalCostVariance,
        totalCostVariancePercent,
        avgHourlyRate: memberCostAnalysis.length > 0
          ? Math.round(memberCostAnalysis.reduce((sum, m) => sum + m.hourlyRate, 0) / memberCostAnalysis.length * 100) / 100
          : 0,
        overallEfficiency: totalActualHours > 0
          ? Math.round((totalEstimatedHours / totalActualHours) * 100) / 100
          : 1,
      },
      byMember: memberCostAnalysis,
      byStage: stageCostSummary,
      insights: {
        topPerformers,
        needSupport,
        costStatus: totalCostVariance <= 0 ? 'under_budget' : totalCostVariancePercent <= 10 ? 'slight_over' : 'over_budget',
        savingsOrOverrun: Math.abs(totalCostVariance),
      },
    };
  }
}
