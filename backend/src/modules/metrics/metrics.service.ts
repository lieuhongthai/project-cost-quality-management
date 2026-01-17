import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Metrics } from './metrics.model';
import { EffortService } from '../effort/effort.service';
import { TestingService } from '../testing/testing.service';
import { PhaseService } from '../phase/phase.service';
import { ProjectService } from '../project/project.service';
import { PhaseScreenFunctionService } from '../screen-function/phase-screen-function.service';
import { MemberService } from '../member/member.service';

export interface ScheduleMetricsInput {
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
}

export interface TestingMetricsInput {
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  defectsDetected: number;
  testingTime: number;
}

@Injectable()
export class MetricsService {
  constructor(
    @Inject('METRICS_REPOSITORY')
    private metricsRepository: typeof Metrics,
    private effortService: EffortService,
    private testingService: TestingService,
    private phaseService: PhaseService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
    @Inject(forwardRef(() => PhaseScreenFunctionService))
    private phaseScreenFunctionService: PhaseScreenFunctionService,
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
      passedTestCases,
      failedTestCases,
      defectsDetected,
      testingTime,
    } = input;

    // Pass Rate
    const passRate = totalTestCases > 0 
      ? (passedTestCases / totalTestCases) * 100 
      : 0;

    // Defect Rate (defects per test case)
    const defectRate = totalTestCases > 0 
      ? defectsDetected / totalTestCases 
      : 0;

    // Time per Test Case
    const timePerTestCase = totalTestCases > 0 
      ? testingTime / totalTestCases 
      : 0;

    // Test Cases per Hour
    const testCasesPerHour = testingTime > 0 
      ? totalTestCases / testingTime 
      : 0;

    return {
      passRate,
      defectRate,
      timePerTestCase,
      testCasesPerHour,
    };
  }

  async calculatePhaseMetrics(phaseId: number, reportId: number): Promise<Metrics> {
    const phase = await this.phaseService.findOne(phaseId);
    const testingSummary = await this.testingService.getPhaseTestingSummary(phaseId);

    // Use phase's actualEffort and progress directly (updated from PhaseScreenFunction)
    // This ensures consistency between what's displayed in the UI and what's in the report
    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: phase.estimatedEffort,
      actualEffort: phase.actualEffort || 0,
      progress: phase.progress || 0,
    });

    const testingMetrics = this.calculateTestingMetrics({
      totalTestCases: testingSummary.totalTestCases,
      passedTestCases: testingSummary.totalPassed,
      failedTestCases: testingSummary.totalFailed,
      defectsDetected: testingSummary.totalDefects,
      testingTime: testingSummary.totalTestingTime,
    });

    // Auto-update phase status based on calculated metrics
    await this.phaseService.updatePhaseStatus(phaseId, {
      schedulePerformanceIndex: scheduleMetrics.schedulePerformanceIndex,
      costPerformanceIndex: scheduleMetrics.costPerformanceIndex,
      delayRate: scheduleMetrics.delayRate,
      passRate: testingMetrics.passRate,
    });

    return this.metricsRepository.create({
      reportId,
      ...scheduleMetrics,
      ...testingMetrics,
    } as any);
  }

  async calculateProjectMetrics(projectId: number, reportId: number): Promise<Metrics> {
    const project = await this.projectService.findOne(projectId);
    const phases = await this.phaseService.findByProject(projectId);

    let totalTestCases = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDefects = 0;
    let totalTestingTime = 0;

    for (const phase of phases) {
      const testingSummary = await this.testingService.getPhaseTestingSummary(phase.id);
      totalTestCases += testingSummary.totalTestCases;
      totalPassed += testingSummary.totalPassed;
      totalFailed += testingSummary.totalFailed;
      totalDefects += testingSummary.totalDefects;
      totalTestingTime += testingSummary.totalTestingTime;
    }

    // Use project's data directly (updated from phases)
    // This ensures consistency between what's displayed in the UI and what's in the report
    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: project.estimatedEffort,
      actualEffort: project.actualEffort || 0,
      progress: project.progress || 0,
    });

    const testingMetrics = this.calculateTestingMetrics({
      totalTestCases,
      passedTestCases: totalPassed,
      failedTestCases: totalFailed,
      defectsDetected: totalDefects,
      testingTime: totalTestingTime,
    });

    // Auto-update project status based on calculated metrics
    await this.projectService.updateProjectStatus(projectId, {
      schedulePerformanceIndex: scheduleMetrics.schedulePerformanceIndex,
      costPerformanceIndex: scheduleMetrics.costPerformanceIndex,
      delayRate: scheduleMetrics.delayRate,
      passRate: testingMetrics.passRate,
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
    const phases = await this.phaseService.findByProject(projectId);

    // Aggregate testing data from all phases
    let totalTestCases = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDefects = 0;
    let totalTestingTime = 0;

    for (const phase of phases) {
      const testingSummary = await this.testingService.getPhaseTestingSummary(phase.id);
      totalTestCases += testingSummary.totalTestCases;
      totalPassed += testingSummary.totalPassed;
      totalFailed += testingSummary.totalFailed;
      totalDefects += testingSummary.totalDefects;
      totalTestingTime += testingSummary.totalTestingTime;
    }

    // Calculate schedule metrics
    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: project.estimatedEffort,
      actualEffort: project.actualEffort || 0,
      progress: project.progress || 0,
    });

    // Calculate testing metrics
    const testingMetrics = this.calculateTestingMetrics({
      totalTestCases,
      passedTestCases: totalPassed,
      failedTestCases: totalFailed,
      defectsDetected: totalDefects,
      testingTime: totalTestingTime,
    });

    // Evaluate status based on metrics
    const evaluatedStatus = this.projectService.evaluateProjectStatus({
      schedulePerformanceIndex: scheduleMetrics.schedulePerformanceIndex,
      costPerformanceIndex: scheduleMetrics.costPerformanceIndex,
      delayRate: scheduleMetrics.delayRate,
      passRate: testingMetrics.passRate,
    });

    // Determine status reasons
    const statusReasons = this.getStatusReasons({
      spi: scheduleMetrics.schedulePerformanceIndex,
      cpi: scheduleMetrics.costPerformanceIndex,
      delayRate: scheduleMetrics.delayRate,
      passRate: testingMetrics.passRate,
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
        totalTestCases,
        passedTestCases: totalPassed,
        failedTestCases: totalFailed,
        defectsDetected: totalDefects,
        passRate: testingMetrics.passRate,
        defectRate: testingMetrics.defectRate,
      },
      phases: phases.map(p => ({
        id: p.id,
        name: p.name,
        progress: p.progress,
        status: p.status,
      })),
    };
  }

  /**
   * Get human-readable reasons for the current status
   * Simplified to focus on Efficiency (CPI) and Quality (Pass Rate)
   */
  private getStatusReasons(metrics: {
    spi: number;
    cpi: number;
    delayRate: number;
    passRate: number;
  }): { type: 'good' | 'warning' | 'risk'; metric: string; value: number; message: string }[] {
    const reasons: { type: 'good' | 'warning' | 'risk'; metric: string; value: number; message: string }[] = [];

    // Efficiency evaluation (CPI) - Main metric
    // CPI = Expected Effort / Actual Effort
    // CPI >= 1.0 means actual ≤ expected (efficient)
    // CPI < 1.0 means actual > expected (over budget)
    const efficiencyPercent = Math.round(metrics.cpi * 100);

    if (metrics.cpi >= 1.0) {
      reasons.push({
        type: 'good',
        metric: 'Hiệu suất',
        value: efficiencyPercent,
        message: `Công việc hiệu quả (${efficiencyPercent}% - thực tế ≤ dự kiến)`
      });
    } else if (metrics.cpi >= 0.83) {
      const overBudgetPercent = Math.round((1 / metrics.cpi - 1) * 100);
      reasons.push({
        type: 'warning',
        metric: 'Hiệu suất',
        value: efficiencyPercent,
        message: `Hơi vượt dự kiến (+${overBudgetPercent}% effort)`
      });
    } else if (metrics.cpi > 0) {
      const overBudgetPercent = Math.round((1 / metrics.cpi - 1) * 100);
      reasons.push({
        type: 'risk',
        metric: 'Hiệu suất',
        value: efficiencyPercent,
        message: `Vượt dự kiến nhiều (+${overBudgetPercent}% effort)`
      });
    } else {
      reasons.push({
        type: 'good',
        metric: 'Hiệu suất',
        value: 0,
        message: 'Chưa có dữ liệu công việc'
      });
    }

    // Pass Rate evaluation (only if there are test cases)
    if (metrics.passRate > 0) {
      if (metrics.passRate >= 95) {
        reasons.push({
          type: 'good',
          metric: 'Chất lượng',
          value: metrics.passRate,
          message: `Chất lượng tốt (${metrics.passRate.toFixed(1)}% pass)`
        });
      } else if (metrics.passRate >= 80) {
        reasons.push({
          type: 'warning',
          metric: 'Chất lượng',
          value: metrics.passRate,
          message: `Cần cải thiện (${metrics.passRate.toFixed(1)}% pass)`
        });
      } else {
        reasons.push({
          type: 'risk',
          metric: 'Chất lượng',
          value: metrics.passRate,
          message: `Chất lượng thấp (${metrics.passRate.toFixed(1)}% pass)`
        });
      }
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
        passRate: metrics.testing.passRate,
      });
      metrics.currentStatus = metrics.evaluatedStatus;
    }

    return metrics;
  }

  /**
   * Get productivity metrics for a project
   * Analyzes effort per member, role, and phase
   */
  async getProjectProductivityMetrics(projectId: number) {
    const project = await this.projectService.findOne(projectId);
    const phases = await this.phaseService.findByProject(projectId);
    const members = await this.memberService.findByProject(projectId);

    // Collect all phase screen functions across phases
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

    const phaseStats: Array<{
      phaseId: number;
      phaseName: string;
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

    // Process each phase
    for (const phase of phases) {
      const psfs = await this.phaseScreenFunctionService.findByPhase(phase.id);

      let phaseTotalEstimated = 0;
      let phaseTotalActual = 0;
      let phaseTasksCompleted = 0;
      let phaseTasksTotal = psfs.filter(p => p.status !== 'Skipped').length;

      for (const psf of psfs) {
        if (psf.status === 'Skipped') continue;

        phaseTotalEstimated += psf.estimatedEffort || 0;
        phaseTotalActual += psf.actualEffort || 0;
        if (psf.status === 'Completed') phaseTasksCompleted++;

        // Update member stats if assigned
        if (psf.assigneeId && memberStats.has(psf.assigneeId)) {
          const mStats = memberStats.get(psf.assigneeId)!;
          mStats.totalEstimated += psf.estimatedEffort || 0;
          mStats.totalActual += psf.actualEffort || 0;
          mStats.tasksTotal++;
          if (psf.status === 'Completed') mStats.tasksCompleted++;

          // Update role stats
          const member = members.find(m => m.id === psf.assigneeId);
          if (member && roleStats.has(member.role)) {
            const rStats = roleStats.get(member.role)!;
            rStats.totalEstimated += psf.estimatedEffort || 0;
            rStats.totalActual += psf.actualEffort || 0;
            rStats.tasksTotal++;
            if (psf.status === 'Completed') rStats.tasksCompleted++;
          }
        }
      }

      // Calculate phase efficiency (EV / AC)
      const phaseEV = phaseTotalEstimated * (phase.progress / 100);
      const phaseEfficiency = phaseTotalActual > 0 ? phaseEV / phaseTotalActual : 0;

      phaseStats.push({
        phaseId: phase.id,
        phaseName: phase.name,
        totalEstimated: phaseTotalEstimated,
        totalActual: phaseTotalActual,
        tasksCompleted: phaseTasksCompleted,
        tasksTotal: phaseTasksTotal,
        efficiency: Math.round(phaseEfficiency * 100) / 100,
        progress: phase.progress,
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
    const totalEstimated = phaseStats.reduce((sum, p) => sum + p.totalEstimated, 0);
    const totalActual = phaseStats.reduce((sum, p) => sum + p.totalActual, 0);
    const tasksCompleted = phaseStats.reduce((sum, p) => sum + p.tasksCompleted, 0);
    const tasksTotal = phaseStats.reduce((sum, p) => sum + p.tasksTotal, 0);
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
      byPhase: phaseStats,
    };
  }
}
