import { Module } from '@nestjs/common';
import { PhaseController } from './phase.controller';
import { PhaseService } from './phase.service';
import { phaseProviders } from './phase.providers';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PhaseController],
  providers: [PhaseService, ...phaseProviders],
  exports: [PhaseService],
})
export class PhaseModule {}
