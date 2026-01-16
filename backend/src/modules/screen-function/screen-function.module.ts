import { Module, forwardRef } from '@nestjs/common';
import { ScreenFunctionController } from './screen-function.controller';
import { PhaseScreenFunctionController } from './phase-screen-function.controller';
import { ScreenFunctionService } from './screen-function.service';
import { PhaseScreenFunctionService } from './phase-screen-function.service';
import { screenFunctionProviders } from './screen-function.providers';
import { DatabaseModule } from '../../database/database.module';
import { PhaseModule } from '../phase/phase.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => PhaseModule)],
  controllers: [ScreenFunctionController, PhaseScreenFunctionController],
  providers: [
    ScreenFunctionService,
    PhaseScreenFunctionService,
    ...screenFunctionProviders,
  ],
  exports: [ScreenFunctionService, PhaseScreenFunctionService],
})
export class ScreenFunctionModule {}
