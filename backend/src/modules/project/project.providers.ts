import { Project } from './project.model';
import { ProjectSettings } from './project-settings.model';

export const projectProviders = [
  {
    provide: 'PROJECT_REPOSITORY',
    useValue: Project,
  },
  {
    provide: 'PROJECT_SETTINGS_REPOSITORY',
    useValue: ProjectSettings,
  },
];
