import { Module, forwardRef } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportExportService } from './report-export.service';
import { reportProviders } from './report.providers';
import { DatabaseModule } from '../../database/database.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ProjectModule } from '../project/project.module';
import { TaskWorkflowModule } from '../task-workflow/task-workflow.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => MetricsModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => TaskWorkflowModule),
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportExportService, ...reportProviders],
  exports: [ReportService],
})
export class ReportModule {}
