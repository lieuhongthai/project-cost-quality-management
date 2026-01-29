import { Module, forwardRef } from '@nestjs/common';
import { TaskWorkflowController } from './task-workflow.controller';
import { TaskWorkflowService } from './task-workflow.service';
import { taskWorkflowProviders } from './task-workflow.providers';
import { DatabaseModule } from '../../database/database.module';
import { ScreenFunctionModule } from '../screen-function/screen-function.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => ScreenFunctionModule),
  ],
  controllers: [TaskWorkflowController],
  providers: [TaskWorkflowService, ...taskWorkflowProviders],
  exports: [TaskWorkflowService],
})
export class TaskWorkflowModule {}
