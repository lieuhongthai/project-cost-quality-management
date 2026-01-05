import { Module, forwardRef } from '@nestjs/common';
import { PhaseController } from './phase.controller';
import { PhaseService } from './phase.service';
import { phaseProviders } from './phase.providers';
import { DatabaseModule } from '../../database/database.module';
import { EffortModule } from '../effort/effort.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => EffortModule)],
  controllers: [PhaseController],
  providers: [PhaseService, ...phaseProviders],
  exports: [PhaseService],
})
export class PhaseModule {}
