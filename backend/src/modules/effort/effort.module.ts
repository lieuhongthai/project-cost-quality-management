import { Module, forwardRef } from '@nestjs/common';
import { EffortController } from './effort.controller';
import { EffortService } from './effort.service';
import { effortProviders } from './effort.providers';
import { DatabaseModule } from '../../database/database.module';
import { PhaseModule } from '../phase/phase.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => PhaseModule)],
  controllers: [EffortController],
  providers: [EffortService, ...effortProviders],
  exports: [EffortService],
})
export class EffortModule {}
