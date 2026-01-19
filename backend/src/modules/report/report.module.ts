import { Module, forwardRef } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { reportProviders } from './report.providers';
import { DatabaseModule } from '../../database/database.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ProjectModule } from '../project/project.module';
import { PhaseModule } from '../phase/phase.module';
import { TestingModule } from '../testing/testing.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => MetricsModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => PhaseModule),
    forwardRef(() => TestingModule),
  ],
  controllers: [ReportController],
  providers: [ReportService, ...reportProviders],
  exports: [ReportService],
})
export class ReportModule {}
