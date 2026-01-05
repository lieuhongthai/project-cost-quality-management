import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { metricsProviders } from './metrics.providers';
import { DatabaseModule } from '../../database/database.module';
import { EffortModule } from '../effort/effort.module';
import { TestingModule } from '../testing/testing.module';
import { PhaseModule } from '../phase/phase.module';

@Module({
  imports: [DatabaseModule, EffortModule, TestingModule, PhaseModule],
  controllers: [MetricsController],
  providers: [MetricsService, ...metricsProviders],
  exports: [MetricsService],
})
export class MetricsModule {}
