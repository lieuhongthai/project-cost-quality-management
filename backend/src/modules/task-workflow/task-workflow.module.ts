import { Module, forwardRef } from '@nestjs/common';
import { TaskWorkflowController } from './task-workflow.controller';
import { TaskWorkflowService } from './task-workflow.service';
import { AISchedulingService } from './ai-scheduling.service';
import { taskWorkflowProviders } from './task-workflow.providers';
import { DatabaseModule } from '../../database/database.module';
import { ScreenFunctionModule } from '../screen-function/screen-function.module';
import { ProjectModule } from '../project/project.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => ScreenFunctionModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => MemberModule),
  ],
  controllers: [TaskWorkflowController],
  providers: [TaskWorkflowService, AISchedulingService, ...taskWorkflowProviders],
  exports: [TaskWorkflowService],
})
export class TaskWorkflowModule {}
