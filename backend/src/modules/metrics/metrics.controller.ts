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

  /**
   * GET /api/metrics/project/:projectId/realtime
   * Get real-time metrics for a project (without creating a report)
   */
  @Get('project/:projectId/realtime')
  getProjectRealTimeMetrics(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.metricsService.getProjectRealTimeMetrics(projectId);
  }

  /**
   * POST /api/metrics/project/:projectId/refresh
   * Refresh and update project status based on current metrics
   */
  @Post('project/:projectId/refresh')
  refreshProjectStatus(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.metricsService.refreshProjectStatus(projectId);
  }

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
