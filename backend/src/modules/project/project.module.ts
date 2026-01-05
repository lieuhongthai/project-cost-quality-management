import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { projectProviders } from './project.providers';
import { DatabaseModule } from '../../database/database.module';
import { PhaseModule } from '../phase/phase.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => PhaseModule)],
  controllers: [ProjectController],
  providers: [ProjectService, ...projectProviders],
  exports: [ProjectService],
})
export class ProjectModule {}
