import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Report } from './report.model';
import { Commentary } from '../commentary/commentary.model';
import { Metrics } from '../metrics/metrics.model';
import { CreateReportDto, UpdateReportDto } from './report.dto';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class ReportService {
  constructor(
    @Inject('REPORT_REPOSITORY')
    private reportRepository: typeof Report,
    @Inject(forwardRef(() => MetricsService))
    private metricsService: MetricsService,
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
    // Create the report first
    const report = await this.reportRepository.create(createReportDto as any);

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
