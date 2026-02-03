import { Module, forwardRef } from '@nestjs/common';
import { CommentaryController } from './commentary.controller';
import { CommentaryService } from './commentary.service';
import { commentaryProviders } from './commentary.providers';
import { DatabaseModule } from '../../database/database.module';
import { ReportModule } from '../report/report.module';
import { MetricsModule } from '../metrics/metrics.module';
import { TaskWorkflowModule } from '../task-workflow/task-workflow.module';

@Module({
  imports: [
    DatabaseModule,
    ReportModule,
    forwardRef(() => MetricsModule),
    TaskWorkflowModule,
  ],
  controllers: [CommentaryController],
  providers: [CommentaryService, ...commentaryProviders],
  exports: [CommentaryService],
})
export class CommentaryModule {}
