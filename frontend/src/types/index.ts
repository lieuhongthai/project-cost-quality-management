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

export interface ProjectSettings {
  id: number;
  projectId: number;
  numberOfMembers: number;
  workingHoursPerDay: number;
  workingDaysPerMonth: number;
}

export interface Phase {
  id: number;
  projectId: number;
  name: PhaseType;
  startDate: string;
  endDate?: string;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: 'Good' | 'Warning' | 'At Risk';
  displayOrder: number;
}

export type PhaseType = 
  | 'Functional Design'
  | 'Coding'
  | 'Unit Test'
  | 'Integration Test'
  | 'System Test';

export interface Effort {
  id: number;
  phaseId: number;
  weekNumber: number;
  year: number;
  weekStartDate: string;
  weekEndDate: string;
  plannedEffort: number;
  actualEffort: number;
  progress: number;
}

export interface Testing {
  id: number;
  phaseId: number;
  weekNumber: number;
  year: number;
  weekStartDate: string;
  weekEndDate: string;
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  testingTime: number;
  defectsDetected: number;
  defectRate: number;
  passRate: number;
  status: 'Good' | 'Acceptable' | 'Poor';
}

export interface Report {
  id: number;
  projectId: number;
  scope: 'Weekly' | 'Phase' | 'Project';
  phaseId?: number;
  phaseName?: string;
  weekNumber?: number;
  year?: number;
  reportDate: string;
  title: string;
  commentaries?: Commentary[];
  metrics?: Metrics[];
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
  defectRate: number;
  passRate: number;
  timePerTestCase: number;
  testCasesPerHour: number;
  defectDensity?: number;
}

export interface EffortSummary {
  totalPlanned: number;
  totalActual: number;
  avgProgress: number;
  variance: number;
  variancePercentage: number;
}

export interface TestingSummary {
  totalTestCases: number;
  totalPassed: number;
  totalFailed: number;
  totalDefects: number;
  totalTestingTime: number;
  overallPassRate: number;
  overallDefectRate: number;
  avgTimePerTestCase: number;
  testCasesPerHour: number;
}

// Screen/Function types
export type ScreenFunctionType = 'Screen' | 'Function';
export type Priority = 'High' | 'Medium' | 'Low';
export type Complexity = 'Simple' | 'Medium' | 'Complex';
export type ScreenFunctionStatus = 'Not Started' | 'In Progress' | 'Completed';
export type PhaseScreenFunctionStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Skipped';

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

export interface PhaseScreenFunction {
  id: number;
  phaseId: number;
  screenFunctionId: number;
  assigneeId?: number;
  estimatedEffort: number;
  actualEffort: number;
  progress: number;
  status: PhaseScreenFunctionStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  phase?: Phase;
  screenFunction?: ScreenFunction;
  assignee?: Member;
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

export interface PhaseScreenFunctionSummary {
  total: number;
  totalEstimated: number;
  totalActual: number;
  avgProgress: number;
  variance: number;
  variancePercentage: number;
  byStatus: {
    'Not Started': number;
    'In Progress': number;
    'Completed': number;
    'Skipped': number;
  };
}

export interface ScreenFunctionWithPhases extends ScreenFunction {
  phaseLinks: PhaseScreenFunction[];
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
