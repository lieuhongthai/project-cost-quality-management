import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProjectService } from './modules/project/project.service';
import { PhaseService } from './modules/phase/phase.service';
import { EffortService } from './modules/effort/effort.service';
import { TestingService } from './modules/testing/testing.service';
import { TaskWorkflowService } from './modules/task-workflow/task-workflow.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const projectService = app.get(ProjectService);
  const phaseService = app.get(PhaseService);
  const effortService = app.get(EffortService);
  const testingService = app.get(TestingService);
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

  // Create phases
  const phases = [
    {
      projectId: project.id,
      name: 'Functional Design',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-15'),
      estimatedEffort: 4,
    },
    {
      projectId: project.id,
      name: 'Coding',
      startDate: new Date('2024-02-16'),
      estimatedEffort: 10,
    },
    {
      projectId: project.id,
      name: 'Unit Test',
      startDate: new Date('2024-06-01'),
      estimatedEffort: 3,
    },
    {
      projectId: project.id,
      name: 'Integration Test',
      startDate: new Date('2024-07-15'),
      estimatedEffort: 4,
    },
    {
      projectId: project.id,
      name: 'System Test',
      startDate: new Date('2024-09-01'),
      estimatedEffort: 3,
    },
  ];

  const createdPhases = [];
  for (const phaseData of phases) {
    const phase = await phaseService.create(phaseData as any);
    createdPhases.push(phase);
    console.log('Created phase:', phase.name);
  }

  // Add sample effort data for the first phase
  const functionalDesignStage = workflow.stages.find(stage => stage.name === 'Functional Design');
  if (!functionalDesignStage) {
    throw new Error('Functional Design stage not found');
  }
  const effortData = [];

  for (let week = 1; week <= 6; week++) {
    const weekStart = new Date('2024-01-01');
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    effortData.push({
      stageId: functionalDesignStage.id,
      weekNumber: week,
      year: 2024,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      plannedEffort: 0.67, // ~4 man-months / 6 weeks
      actualEffort: week <= 4 ? 0.7 : 0.65, // Slightly over initially
      progress: week * 16.67, // ~100% / 6 weeks
    });
  }

  await effortService.bulkCreate({
    stageId: functionalDesignStage.id,
    efforts: effortData,
  });

  console.log('Created effort data for Functional Design phase');

  // Add sample testing data for Unit Test phase
  const unitTestStage = workflow.stages.find(stage => stage.name === 'Unit Test');
  if (!unitTestStage) {
    throw new Error('Unit Test stage not found');
  }
  const testingData = [];

  for (let week = 1; week <= 4; week++) {
    const weekStart = new Date('2024-06-01');
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const totalTestCases = 100 * week;
    const passedTestCases = Math.floor(totalTestCases * (0.90 + week * 0.02)); // Improving pass rate
    const failedTestCases = totalTestCases - passedTestCases;

    await testingService.create({
      stageId: unitTestStage.id,
      weekNumber: week,
      year: 2024,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      totalTestCases,
      passedTestCases,
      failedTestCases,
      testingTime: totalTestCases * 0.5, // 0.5 hours per test case
      defectsDetected: Math.floor(totalTestCases * 0.08), // 8% defect rate
    });
  }

  console.log('Created testing data for Unit Test phase');

  console.log('Database seeded successfully!');
  
  await app.close();
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
