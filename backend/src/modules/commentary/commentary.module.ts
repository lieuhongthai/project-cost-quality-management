import { Module } from '@nestjs/common';
import { CommentaryController } from './commentary.controller';
import { CommentaryService } from './commentary.service';
import { commentaryProviders } from './commentary.providers';
import { DatabaseModule } from '../../database/database.module';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [DatabaseModule, ReportModule],
  controllers: [CommentaryController],
  providers: [CommentaryService, ...commentaryProviders],
  exports: [CommentaryService],
})
export class CommentaryModule {}
