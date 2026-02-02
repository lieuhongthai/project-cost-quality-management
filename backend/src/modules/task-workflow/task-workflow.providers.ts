import { WorkflowStage } from './workflow-stage.model';
import { WorkflowStep } from './workflow-step.model';
import { TaskWorkflow } from './task-workflow.model';
import { StepScreenFunction } from './step-screen-function.model';

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
  {
    provide: 'STEP_SCREEN_FUNCTION_REPOSITORY',
    useValue: StepScreenFunction,
  },
];
