import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { projectProviders } from './project.providers';
import { DatabaseModule } from '../../database/database.module';
import { TaskWorkflowModule } from '../task-workflow/task-workflow.module';
import { MemberModule } from '../member/member.module';
import { ScreenFunctionModule } from '../screen-function/screen-function.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => TaskWorkflowModule),
    forwardRef(() => MemberModule),
    forwardRef(() => ScreenFunctionModule),
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ...projectProviders],
  exports: [ProjectService],
})
export class ProjectModule {}
