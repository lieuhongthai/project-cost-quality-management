import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Report } from './report.model';
import { Commentary } from '../commentary/commentary.model';
import { Metrics } from '../metrics/metrics.model';
import { CreateReportDto, UpdateReportDto } from './report.dto';

@Injectable()
export class ReportService {
  constructor(
    @Inject('REPORT_REPOSITORY')
    private reportRepository: typeof Report,
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
    return this.reportRepository.create(createReportDto as any);
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
