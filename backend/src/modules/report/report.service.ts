import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Report } from './report.model';
import { Commentary } from '../commentary/commentary.model';
import { Metrics } from '../metrics/metrics.model';
import { CreateReportDto, UpdateReportDto } from './report.dto';
import { MetricsService } from '../metrics/metrics.service';
import { ProjectService } from '../project/project.service';
import { PhaseService } from '../phase/phase.service';
import { TestingService } from '../testing/testing.service';

@Injectable()
export class ReportService {
  constructor(
    @Inject('REPORT_REPOSITORY')
    private reportRepository: typeof Report,
    @Inject(forwardRef(() => MetricsService))
    private metricsService: MetricsService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
    @Inject(forwardRef(() => PhaseService))
    private phaseService: PhaseService,
    @Inject(forwardRef(() => TestingService))
    private testingService: TestingService,
  ) {}

  async findAll(): Promise<Report[]> {
    return this.reportRepository.findAll({
      include: [
        { model: Commentary, as: 'commentaries' },
        { model: Metrics, as: 'metrics' },
      ],
    });
  }

  async findByProject(projectId: number): Promise<Report[]> {
    return this.reportRepository.findAll({
      where: { projectId },
      include: [
        { model: Commentary, as: 'commentaries' },
        { model: Metrics, as: 'metrics' },
      ],
      order: [['reportDate', 'DESC']],
    });
  }

  async findByScope(projectId: number, scope: string): Promise<Report[]> {
    return this.reportRepository.findAll({
      where: { projectId, scope },
      include: [
        { model: Commentary, as: 'commentaries' },
        { model: Metrics, as: 'metrics' },
      ],
      order: [['reportDate', 'DESC']],
    });
  }

  async findOne(id: number): Promise<Report> {
    const report = await this.reportRepository.findByPk(id, {
      include: [
        { model: Commentary, as: 'commentaries' },
        { model: Metrics, as: 'metrics' },
      ],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async create(createReportDto: CreateReportDto): Promise<Report> {
    // Capture snapshot data BEFORE creating the report
    const snapshotData = await this.captureSnapshot(
      createReportDto.projectId,
      createReportDto.scope,
      createReportDto.phaseId,
    );

    // Create the report with snapshot data
    const report = await this.reportRepository.create({
      ...createReportDto,
      snapshotData,
      snapshotAt: new Date(),
    } as any);

    // Automatically calculate and create metrics based on scope
    try {
      if (createReportDto.scope === 'Project') {
        await this.metricsService.calculateProjectMetrics(
          createReportDto.projectId,
          report.id,
        );
      } else if (createReportDto.scope === 'Phase' && createReportDto.phaseId) {
        await this.metricsService.calculatePhaseMetrics(
          createReportDto.phaseId,
          report.id,
        );
      } else if (createReportDto.scope === 'Weekly' && createReportDto.phaseId) {
        // For weekly reports, also calculate phase metrics if phaseId is provided
        await this.metricsService.calculatePhaseMetrics(
          createReportDto.phaseId,
          report.id,
        );
      }
    } catch (error) {
      // Log error but don't fail the report creation
      console.error('Error calculating metrics for new report:', error);
    }

    // Return the report with metrics included
    return this.findOne(report.id);
  }

  /**
   * Capture a complete snapshot of all metrics at the current moment
   * This data will be stored and never change, allowing comparison over time
   */
  private async captureSnapshot(
    projectId: number,
    scope: string,
    phaseId?: number,
  ): Promise<Record<string, any>> {
    const project = await this.projectService.findOne(projectId);
    const phases = await this.phaseService.findByProject(projectId);

    // Collect testing data
    let totalTestCases = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDefects = 0;
    let totalTestingTime = 0;

    const phaseSnapshots: Array<{
      id: number;
      name: string;
      estimatedEffort: number;
      actualEffort: number;
      progress: number;
      status: string;
      startDate: Date;
      endDate: Date;
      testing: {
        totalTestCases: number;
        totalPassed: number;
        totalFailed: number;
        totalDefects: number;
        passRate: number;
      };
    }> = [];

    for (const phase of phases) {
      const testingSummary = await this.testingService.getPhaseTestingSummary(phase.id);
      totalTestCases += testingSummary.totalTestCases;
      totalPassed += testingSummary.totalPassed;
      totalFailed += testingSummary.totalFailed;
      totalDefects += testingSummary.totalDefects;
      totalTestingTime += testingSummary.totalTestingTime;

      phaseSnapshots.push({
        id: phase.id,
        name: phase.name,
        estimatedEffort: phase.estimatedEffort,
        actualEffort: phase.actualEffort || 0,
        progress: phase.progress || 0,
        status: phase.status,
        startDate: phase.startDate,
        endDate: phase.endDate,
        testing: {
          totalTestCases: testingSummary.totalTestCases,
          totalPassed: testingSummary.totalPassed,
          totalFailed: testingSummary.totalFailed,
          totalDefects: testingSummary.totalDefects,
          passRate: testingSummary.totalTestCases > 0
            ? (testingSummary.totalPassed / testingSummary.totalTestCases) * 100
            : 0,
        },
      });
    }

    // Calculate schedule metrics
    const scheduleMetrics = this.metricsService.calculateScheduleMetrics({
      estimatedEffort: project.estimatedEffort,
      actualEffort: project.actualEffort || 0,
      progress: project.progress || 0,
    });

    // Calculate testing metrics
    const testingMetrics = this.metricsService.calculateTestingMetrics({
      totalTestCases,
      passedTestCases: totalPassed,
      failedTestCases: totalFailed,
      defectsDetected: totalDefects,
      testingTime: totalTestingTime,
    });

    // Get productivity metrics
    let productivityMetrics = null;
    try {
      productivityMetrics = await this.metricsService.getProjectProductivityMetrics(projectId);
    } catch (error) {
      console.error('Error capturing productivity metrics:', error);
    }

    // Get member cost analysis
    let memberCostAnalysis = null;
    try {
      memberCostAnalysis = await this.metricsService.getProjectMemberCostAnalysis(projectId);
    } catch (error) {
      console.error('Error capturing member cost analysis:', error);
    }

    // Build the snapshot
    const snapshot: Record<string, any> = {
      capturedAt: new Date().toISOString(),
      scope,
      project: {
        id: project.id,
        name: project.name,
        estimatedEffort: project.estimatedEffort,
        actualEffort: project.actualEffort || 0,
        progress: project.progress || 0,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      phases: phaseSnapshots,
      schedule: {
        spi: scheduleMetrics.schedulePerformanceIndex,
        cpi: scheduleMetrics.costPerformanceIndex,
        plannedValue: scheduleMetrics.plannedValue,
        earnedValue: scheduleMetrics.earnedValue,
        actualCost: scheduleMetrics.actualCost,
        delayRate: scheduleMetrics.delayRate,
        delayInManMonths: scheduleMetrics.delayInManMonths,
        estimatedVsActual: scheduleMetrics.estimatedVsActual,
      },
      forecasting: {
        bac: scheduleMetrics.budgetAtCompletion,
        eac: scheduleMetrics.estimateAtCompletion,
        vac: scheduleMetrics.varianceAtCompletion,
        tcpi: scheduleMetrics.toCompletePerformanceIndex,
      },
      testing: {
        totalTestCases,
        totalPassed,
        totalFailed,
        totalDefects,
        totalTestingTime,
        passRate: testingMetrics.passRate,
        defectRate: testingMetrics.defectRate,
        timePerTestCase: testingMetrics.timePerTestCase,
        testCasesPerHour: testingMetrics.testCasesPerHour,
      },
      productivity: productivityMetrics,
      memberCost: memberCostAnalysis,
    };

    // For phase-specific reports, add detailed phase data
    if (scope === 'Phase' && phaseId) {
      const phase = phases.find(p => p.id === phaseId);
      if (phase) {
        const phaseTestingSummary = await this.testingService.getPhaseTestingSummary(phaseId);
        const phaseScheduleMetrics = this.metricsService.calculateScheduleMetrics({
          estimatedEffort: phase.estimatedEffort,
          actualEffort: phase.actualEffort || 0,
          progress: phase.progress || 0,
        });

        snapshot.phaseDetail = {
          id: phase.id,
          name: phase.name,
          estimatedEffort: phase.estimatedEffort,
          actualEffort: phase.actualEffort || 0,
          progress: phase.progress || 0,
          status: phase.status,
          schedule: {
            spi: phaseScheduleMetrics.schedulePerformanceIndex,
            cpi: phaseScheduleMetrics.costPerformanceIndex,
            earnedValue: phaseScheduleMetrics.earnedValue,
            actualCost: phaseScheduleMetrics.actualCost,
          },
          testing: {
            totalTestCases: phaseTestingSummary.totalTestCases,
            totalPassed: phaseTestingSummary.totalPassed,
            totalFailed: phaseTestingSummary.totalFailed,
            totalDefects: phaseTestingSummary.totalDefects,
          },
        };
      }
    }

    return snapshot;
  }

  async update(id: number, updateReportDto: UpdateReportDto): Promise<Report> {
    const report = await this.findOne(id);
    await report.update(updateReportDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const report = await this.findOne(id);
    await report.destroy();
  }
}
