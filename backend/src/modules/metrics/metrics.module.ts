import { Module, forwardRef } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { metricsProviders } from './metrics.providers';
import { DatabaseModule } from '../../database/database.module';
import { ProjectModule } from '../project/project.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => ProjectModule),
    forwardRef(() => MemberModule),
  ],
  controllers: [MetricsController],
  providers: [MetricsService, ...metricsProviders],
  exports: [MetricsService],
})
export class MetricsModule {}
