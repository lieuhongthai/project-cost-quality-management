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
    const effortSummary = await this.effortService.getPhaseEffortSummary(phaseId);
    const testingSummary = await this.testingService.getPhaseTestingSummary(phaseId);

    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: phase.estimatedEffort,
      actualEffort: effortSummary.totalActual,
      progress: effortSummary.avgProgress,
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
    const phases = await this.phaseService.findByProject(projectId);

    let totalEstimatedEffort = 0;
    let totalActualEffort = 0;
    let totalProgress = 0;
    let totalTestCases = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDefects = 0;
    let totalTestingTime = 0;

    for (const phase of phases) {
      const effortSummary = await this.effortService.getPhaseEffortSummary(phase.id);
      const testingSummary = await this.testingService.getPhaseTestingSummary(phase.id);

      totalEstimatedEffort += phase.estimatedEffort;
      totalActualEffort += effortSummary.totalActual;
      totalProgress += effortSummary.avgProgress;
      totalTestCases += testingSummary.totalTestCases;
      totalPassed += testingSummary.totalPassed;
      totalFailed += testingSummary.totalFailed;
      totalDefects += testingSummary.totalDefects;
      totalTestingTime += testingSummary.totalTestingTime;
    }

    const avgProgress = phases.length > 0 ? totalProgress / phases.length : 0;

    const scheduleMetrics = this.calculateScheduleMetrics({
      estimatedEffort: totalEstimatedEffort,
      actualEffort: totalActualEffort,
      progress: avgProgress,
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
}
