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
