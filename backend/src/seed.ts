import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProjectService } from './modules/project/project.service';
import { TaskWorkflowService } from './modules/task-workflow/task-workflow.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const projectService = app.get(ProjectService);
  const taskWorkflowService = app.get(TaskWorkflowService);

  console.log('Seeding database...');

  // Create a sample project
  const project = await projectService.create({
    name: 'E-Commerce Platform',
    description: 'Building a scalable e-commerce platform with microservices',
    startDate: new Date('2024-01-01'),
    estimatedEffort: 24, // 24 man-months
  });

  console.log('Created project:', project.name);

  // Create project settings
  await projectService.createSettings({
    projectId: project.id,
    numberOfMembers: 5,
    workingHoursPerDay: 8,
    workingDaysPerMonth: 22,
  });

  console.log('Created project settings');

  // Initialize default workflow stages
  const workflow = await taskWorkflowService.initializeProjectWorkflow({ projectId: project.id });
  console.log('Initialized workflow stages');

  console.log('Database seeded successfully!');
  
  await app.close();
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
