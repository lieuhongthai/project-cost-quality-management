import { Module, forwardRef } from '@nestjs/common';
import { CommentaryController } from './commentary.controller';
import { CommentaryService } from './commentary.service';
import { commentaryProviders } from './commentary.providers';
import { DatabaseModule } from '../../database/database.module';
import { ReportModule } from '../report/report.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PhaseModule } from '../phase/phase.module';

@Module({
  imports: [
    DatabaseModule,
    ReportModule,
    forwardRef(() => MetricsModule),
    PhaseModule,
  ],
  controllers: [CommentaryController],
  providers: [CommentaryService, ...commentaryProviders],
  exports: [CommentaryService],
})
export class CommentaryModule {}
