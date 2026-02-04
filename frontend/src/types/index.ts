export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: 'Good' | 'Warning' | 'At Risk';
  createdAt: string;
  updatedAt: string;
  settings?: ProjectSettings;
}

export type EffortUnit = 'man-hour' | 'man-day' | 'man-month';

export interface ProjectSettings {
  id: number;
  projectId: number;
  numberOfMembers: number;
  workingHoursPerDay: number;
  workingDaysPerMonth: number;
  defaultEffortUnit: EffortUnit;
  nonWorkingDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  holidays: string[]; // Array of YYYY-MM-DD strings
}

export interface Permission {
  id: number;
  key: string;
}

export interface Role {
  id: number;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
}

export interface Position {
  id: number;
  name: string;
  isSystem: boolean;
  roles: Role[];
}

export interface User {
  id: number;
  username: string;
  email?: string;
  mustChangePassword: boolean;
  positionId: number;
  position?: Position;
  createdAt: string;
  updatedAt: string;
}

// Days of week constants
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export const DEFAULT_NON_WORKING_DAYS = [0, 6]; // Sunday and Saturday

export interface Report {
  id: number;
  projectId: number;
  scope: 'Weekly' | 'Stage' | 'Project';
  stageId?: number;
  stageName?: string;
  weekNumber?: number;
  year?: number;
  reportDate: string;
  title: string;
  commentaries?: Commentary[];
  metrics?: Metrics[];
  snapshotData?: Record<string, any>; // Frozen metrics data at time of report creation
  snapshotAt?: string; // Timestamp when snapshot was taken
  createdAt: string;
  updatedAt: string;
}

export interface Commentary {
  id: number;
  reportId: number;
  type: 'Manual' | 'AI Generated';
  content: string;
  version: number;
  author?: string;
  createdAt: string;
}

export interface Metrics {
  id: number;
  reportId: number;
  delayRate: number;
  delayInManMonths: number;
  estimatedVsActual: number;
  schedulePerformanceIndex: number;
  costPerformanceIndex: number;
  plannedValue: number; // PV - Expected cost of work scheduled
  earnedValue: number; // EV - Value of work completed
  actualCost: number; // AC - Actual cost of work performed
  budgetAtCompletion: number; // BAC - Total budget
  estimateAtCompletion: number; // EAC - Projected total cost
  varianceAtCompletion: number; // VAC = BAC - EAC
  toCompletePerformanceIndex: number; // TCPI = (BAC - EV) / (BAC - AC)
  defectRate: number;
  passRate: number;
  timePerTestCase: number;
  testCasesPerHour: number;
  defectDensity?: number;
}

// Screen/Function types
export type ScreenFunctionType = 'Screen' | 'Function';
export type Priority = 'High' | 'Medium' | 'Low';
export type Complexity = 'Simple' | 'Medium' | 'Complex';
export type ScreenFunctionStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface ScreenFunction {
  id: number;
  projectId: number;
  name: string;
  type: ScreenFunctionType;
  description?: string;
  priority: Priority;
  complexity: Complexity;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: ScreenFunctionStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}


export interface ScreenFunctionSummary {
  total: number;
  totalEstimated: number;
  totalActual: number;
  avgProgress: number;
  variance: number;
  variancePercentage: number;
  byType: {
    Screen: number;
    Function: number;
  };
  byStatus: {
    'Not Started': number;
    'In Progress': number;
    'Completed': number;
  };
  byPriority: {
    High: number;
    Medium: number;
    Low: number;
  };
}

// Member types
export type MemberRole = 'PM' | 'TL' | 'BA' | 'DEV' | 'QA' | 'Comtor' | 'Designer' | 'DevOps' | 'Other';
export type MemberStatus = 'Active' | 'Inactive' | 'On Leave';
export type MemberAvailability = 'Full-time' | 'Part-time' | 'Contract';

export interface Member {
  id: number;
  projectId: number;
  name: string;
  email?: string;
  role: MemberRole;
  yearsOfExperience?: number;
  skills: string[];
  hourlyRate?: number;
  availability: MemberAvailability;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MemberSummary {
  total: number;
  byRole: Record<MemberRole, number>;
  byStatus: Record<MemberStatus, number>;
  byAvailability: Record<MemberAvailability, number>;
  averageExperience: number;
  totalHourlyRate: number;
}

export interface MemberWorkload {
  memberId: number;
  memberName: string;
  totalAssigned: number;
  totalEstimatedEffort: number;
  totalActualEffort: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
}

// Task Workflow types
export type StageStatus = 'Good' | 'Warning' | 'At Risk';
export type StepScreenFunctionStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Skipped';

export interface WorkflowStage {
  id: number;
  projectId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  color?: string;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  estimatedEffort?: number;
  actualEffort?: number;
  progress?: number;
  status?: StageStatus;
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  id: number;
  stageId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface TaskWorkflow {
  id: number;
  screenFunctionId: number;
  stepId: number;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: number;
  note?: string;
  completedByMember?: Member;
}

export interface TaskWorkflowProgress {
  total: number;
  completed: number;
  percentage: number;
}

export interface ProjectWorkflowData {
  stages: (WorkflowStage & { steps: WorkflowStep[] })[];
  screenFunctions: ScreenFunction[];
  taskWorkflows: TaskWorkflow[];
  progress: TaskWorkflowProgress;
}

export interface WorkflowProgressByStage {
  stageId: number;
  stageName: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface WorkflowProgressByScreenFunction {
  screenFunctionId: number;
  screenFunctionName: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface ProjectWorkflowProgress {
  overall: TaskWorkflowProgress;
  byStage: WorkflowProgressByStage[];
  byScreenFunction: WorkflowProgressByScreenFunction[];
}

// Step Screen Function Member types
export interface StepScreenFunctionMember {
  id: number;
  stepScreenFunctionId: number;
  memberId: number;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  note?: string;
  member?: Member;
  createdAt?: string;
  updatedAt?: string;
}

// Step Screen Function types
export interface StepScreenFunction {
  id: number;
  stepId: number;
  screenFunctionId: number;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: StepScreenFunctionStatus;
  note?: string;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  screenFunction?: ScreenFunction;
  members?: StepScreenFunctionMember[];
  createdAt?: string;
  updatedAt?: string;
}

// Step-level statistics
export interface StepStatistics {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  estimatedEffort: number;
  actualEffort: number;
}

// Stage Detail types
export interface StageDetailData {
  stage: WorkflowStage;
  steps: (WorkflowStep & {
    statistics?: StepStatistics;
    screenFunctions: Array<{
      id: number;
      screenFunctionId: number;
      screenFunction: ScreenFunction;
      members?: StepScreenFunctionMember[];
      estimatedEffort: number;
      actualEffort: number;
      progress: number;
      status: StepScreenFunctionStatus;
      note?: string;
      estimatedStartDate?: string;
      estimatedEndDate?: string;
      actualStartDate?: string;
      actualEndDate?: string;
    }>;
  })[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
  effort: {
    estimated: number;
    actual: number;
    variance: number;
  };
  status: StageStatus;
}

export interface StageOverviewData {
  id: number;
  name: string;
  displayOrder: number;
  color?: string;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: StageStatus;
  stepsCount: number;
  linkedScreensCount: number;
}

// ===== Metric Types =====

export interface MetricType {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  categories?: MetricCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MetricCategory {
  id: number;
  metricTypeId: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  metricType?: MetricType;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskMemberMetric {
  id: number;
  stepScreenFunctionMemberId: number;
  metricCategoryId: number;
  value: number;
  note?: string;
  metricCategory?: MetricCategory;
  createdAt?: string;
  updatedAt?: string;
}
