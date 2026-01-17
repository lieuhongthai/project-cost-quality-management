import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Metrics } from './metrics.model';
import { EffortService } from '../effort/effort.service';
import { TestingService } from '../testing/testing.service';
import { PhaseService } from '../phase/phase.service';
import { ProjectService } from '../project/project.service';

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
  ) {}

  calculateScheduleMetrics(input: ScheduleMetricsInput) {
    const { estimatedEffort, actualEffort, progress } = input;

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
}
