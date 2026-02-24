import { WorkflowStage } from './workflow-stage.model';
import { WorkflowStep } from './workflow-step.model';
import { TaskWorkflow } from './task-workflow.model';
import { StepScreenFunction } from './step-screen-function.model';
import { StepScreenFunctionMember } from './step-screen-function-member.model';
import { MetricType } from './metric-type.model';
import { MetricCategory } from './metric-category.model';
import { TaskMemberMetric } from './task-member-metric.model';
import { WorklogMappingRule } from './worklog-mapping-rule.model';
import { WorklogImportBatch } from './worklog-import-batch.model';
import { WorklogImportItem } from './worklog-import-item.model';

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
  {
    provide: 'WORKLOG_MAPPING_RULE_REPOSITORY',
    useValue: WorklogMappingRule,
  },
  {
    provide: 'WORKLOG_IMPORT_BATCH_REPOSITORY',
    useValue: WorklogImportBatch,
  },
  {
    provide: 'WORKLOG_IMPORT_ITEM_REPOSITORY',
    useValue: WorklogImportItem,
  },
];
