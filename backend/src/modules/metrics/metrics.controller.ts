import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('report/:reportId')
  findByReport(@Param('reportId', ParseIntPipe) reportId: number) {
    return this.metricsService.findByReport(reportId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.metricsService.findOne(id);
  }

  @Post('phase/:phaseId')
  calculatePhaseMetrics(
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Query('reportId', ParseIntPipe) reportId: number,
  ) {
    return this.metricsService.calculatePhaseMetrics(phaseId, reportId);
  }

  @Post('project/:projectId')
  calculateProjectMetrics(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('reportId', ParseIntPipe) reportId: number,
  ) {
    return this.metricsService.calculateProjectMetrics(projectId, reportId);
  }
}
