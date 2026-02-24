import { Module, forwardRef } from '@nestjs/common';
import { ScreenFunctionController } from './screen-function.controller';
import { ScreenFunctionService } from './screen-function.service';
import { screenFunctionProviders } from './screen-function.providers';
import { DatabaseModule } from '../../database/database.module';
import { TaskWorkflowModule } from '../task-workflow/task-workflow.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => TaskWorkflowModule)],
  controllers: [ScreenFunctionController],
  providers: [ScreenFunctionService, ...screenFunctionProviders],
  exports: [ScreenFunctionService, ...screenFunctionProviders],
})
export class ScreenFunctionModule {}
