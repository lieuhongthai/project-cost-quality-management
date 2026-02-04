import { WorkflowStage } from './workflow-stage.model';
import { WorkflowStep } from './workflow-step.model';
import { TaskWorkflow } from './task-workflow.model';
import { StepScreenFunction } from './step-screen-function.model';
import { StepScreenFunctionMember } from './step-screen-function-member.model';
import { MetricType } from './metric-type.model';
import { MetricCategory } from './metric-category.model';
import { TaskMemberMetric } from './task-member-metric.model';

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
  {
    provide: 'STEP_SCREEN_FUNCTION_MEMBER_REPOSITORY',
    useValue: StepScreenFunctionMember,
  },
  {
    provide: 'METRIC_TYPE_REPOSITORY',
    useValue: MetricType,
  },
  {
    provide: 'METRIC_CATEGORY_REPOSITORY',
    useValue: MetricCategory,
  },
  {
    provide: 'TASK_MEMBER_METRIC_REPOSITORY',
    useValue: TaskMemberMetric,
  },
];
