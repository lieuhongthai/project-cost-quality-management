import { Module, forwardRef } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { metricsProviders } from './metrics.providers';
import { DatabaseModule } from '../../database/database.module';
import { EffortModule } from '../effort/effort.module';
import { TestingModule } from '../testing/testing.module';
import { PhaseModule } from '../phase/phase.module';
import { ProjectModule } from '../project/project.module';
import { ScreenFunctionModule } from '../screen-function/screen-function.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    DatabaseModule,
    EffortModule,
    TestingModule,
    PhaseModule,
    forwardRef(() => ProjectModule),
    forwardRef(() => ScreenFunctionModule),
    forwardRef(() => MemberModule),
  ],
  controllers: [MetricsController],
  providers: [MetricsService, ...metricsProviders],
  exports: [MetricsService],
})
export class MetricsModule {}
