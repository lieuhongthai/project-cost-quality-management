import { WorkflowStage } from './workflow-stage.model';
import { WorkflowStep } from './workflow-step.model';
import { TaskWorkflow } from './task-workflow.model';

export const taskWorkflowProviders = [
  {
    provide: 'WORKFLOW_STAGE_REPOSITORY',
    useValue: WorkflowStage,
  },
  {
    provide: 'WORKFLOW_STEP_REPOSITORY',
    useValue: WorkflowStep,
  },
  {
    provide: 'TASK_WORKFLOW_REPOSITORY',
    useValue: TaskWorkflow,
  },
];
