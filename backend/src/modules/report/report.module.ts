import { Module, forwardRef } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { reportProviders } from './report.providers';
import { DatabaseModule } from '../../database/database.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => MetricsModule)],
  controllers: [ReportController],
  providers: [ReportService, ...reportProviders],
  exports: [ReportService],
})
export class ReportModule {}
