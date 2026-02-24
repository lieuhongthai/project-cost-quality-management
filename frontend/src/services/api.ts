import axios from 'axios';
import type {
  Project,
  ProjectSettings,
  Report,
  Commentary,
  Metrics,
  ScreenFunction,
  ScreenFunctionSummary,
  ScreenFunctionDefaultMember,
  Member,
  MemberSummary,
  MemberWorkload,
  LinkableUser,
  MyProjectMember,
  TodoItem,
  Permission,
  Position,
  Role,
  User,
  WorkflowStage,
  WorkflowStep,
  TaskWorkflow,
  ProjectWorkflowData,
  MetricType,
  MetricCategory,
  TaskMemberMetric,
  ProjectWorkflowProgress,
  TaskWorkflowProgress,
  StepScreenFunction,
  StageDetailData,
  StageOverviewData,
  StageSFStat,
  ProjectMetricInsights,
  ProjectMetricTypeSummary,
} from '../types';
import type { AuthResponse, AuthUser } from '../types/auth';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  me: () => api.get<AuthUser>('/auth/me'),
  changeCredentials: (data: { newPassword: string; newUsername?: string }) =>
    api.post('/auth/change-credentials', data),
};

// Project APIs
export const projectApi = {
  getAll: () => api.get<Project[]>('/projects'),
  getOne: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),

  // Settings
  getSettings: (id: number) => api.get<ProjectSettings>(`/projects/${id}/settings`),
  createSettings: (data: Partial<ProjectSettings>) => api.post<ProjectSettings>('/projects/settings', data),
  updateSettings: (id: number, data: Partial<ProjectSettings>) => api.put<ProjectSettings>(`/projects/${id}/settings`, data),

  // Calculate end date based on start date and estimated effort
  calculateEndDate: (data: {
    startDate: string;
    estimatedEffortDays: number;
    projectId?: number;
    nonWorkingDays?: number[];
    holidays?: string[];
  }) => api.post<{ endDate: string; workingDays: number; totalDays: number }>('/projects/calculate-end-date', data),

  // Quick setup: create members, screen functions, update settings in one call
  quickSetup: (projectId: number, data: {
    settings?: any;
    members?: Array<{ name: string; role: string; email?: string; skills?: string[]; hourlyRate?: number }>;
    screenFunctions?: Array<{ name: string; type?: string; complexity?: string; priority?: string; description?: string }>;
  }) => api.post(`/projects/${projectId}/quick-setup`, data),
};


// Report APIs
export const reportApi = {
  getAll: () => api.get<Report[]>('/reports'),
  getByProject: (projectId: number) => api.get<Report[]>(`/reports/project/${projectId}`),
  getByScope: (projectId: number, scope: string) => 
    api.get<Report[]>(`/reports/project/${projectId}/scope/${scope}`),
  getOne: (id: number) => api.get<Report>(`/reports/${id}`),
  exportExcel: (id: number) => api.get(`/reports/${id}/export/excel`, { responseType: 'blob' }),
  exportPdf: (id: number) => api.get(`/reports/${id}/export/pdf`, { responseType: 'blob' }),
  create: (data: Partial<Report>) => api.post<Report>('/reports', data),
  update: (id: number, data: Partial<Report>) => api.put<Report>(`/reports/${id}`, data),
  delete: (id: number) => api.delete(`/reports/${id}`),
};

// Commentary APIs
export const commentaryApi = {
  getAll: () => api.get<Commentary[]>('/commentaries'),
  getByReport: (reportId: number) => api.get<Commentary[]>(`/commentaries/report/${reportId}`),
  getOne: (id: number) => api.get<Commentary>(`/commentaries/${id}`),
  create: (data: Partial<Commentary>) => api.post<Commentary>('/commentaries', data),
  generateAI: (reportId: number, language?: string) =>
    api.post<Commentary>('/commentaries/generate', { reportId, language }),
  update: (id: number, data: Partial<Commentary>) => api.put<Commentary>(`/commentaries/${id}`, data),
  delete: (id: number) => api.delete(`/commentaries/${id}`),
};

// Metrics APIs
export const metricsApi = {
  getByReport: (reportId: number) => api.get<Metrics[]>(`/metrics/report/${reportId}`),
  getOne: (id: number) => api.get<Metrics>(`/metrics/${id}`),
  calculateStage: (stageId: number, reportId: number) =>
    api.post<Metrics>(`/metrics/stage/${stageId}?reportId=${reportId}`),
  calculateProject: (projectId: number, reportId: number) =>
    api.post<Metrics>(`/metrics/project/${projectId}?reportId=${reportId}`),
  // Real-time metrics (without creating a report)
  getProjectRealTime: (projectId: number) => api.get(`/metrics/project/${projectId}/realtime`),
  refreshProjectStatus: (projectId: number) => api.post(`/metrics/project/${projectId}/refresh`),
  // Productivity metrics
  getProjectProductivity: (projectId: number) => api.get(`/metrics/project/${projectId}/productivity`),
  // Member cost analysis
  getProjectMemberCost: (projectId: number) => api.get(`/metrics/project/${projectId}/member-cost`),
};

// Screen/Function APIs
export const screenFunctionApi = {
  getAll: () => api.get<ScreenFunction[]>('/screen-functions'),
  getByProject: (projectId: number) => api.get<ScreenFunction[]>(`/screen-functions/project/${projectId}`),
  getOne: (id: number) => api.get<ScreenFunction>(`/screen-functions/${id}`),
  create: (data: Partial<ScreenFunction>) => api.post<ScreenFunction>('/screen-functions', data),
  update: (id: number, data: Partial<ScreenFunction>) => api.put<ScreenFunction>(`/screen-functions/${id}`, data),
  delete: (id: number) => api.delete(`/screen-functions/${id}`),
  reorder: (items: Array<{ id: number; displayOrder: number }>) =>
    api.put('/screen-functions/reorder', { items }),
  getSummary: (projectId: number) => api.get<ScreenFunctionSummary>(`/screen-functions/project/${projectId}/summary`),

  // Default Members
  getDefaultMembers: (screenFunctionId: number) =>
    api.get<ScreenFunctionDefaultMember[]>(`/screen-functions/${screenFunctionId}/default-members`),
  getDefaultMembersByProject: (projectId: number) =>
    api.get<ScreenFunctionDefaultMember[]>(`/screen-functions/project/${projectId}/default-members`),
  setDefaultMembers: (screenFunctionId: number, memberIds: number[]) =>
    api.put<ScreenFunctionDefaultMember[]>(`/screen-functions/${screenFunctionId}/default-members`, { memberIds }),
  addDefaultMember: (screenFunctionId: number, memberId: number) =>
    api.post<ScreenFunctionDefaultMember>(`/screen-functions/${screenFunctionId}/default-members`, { memberId }),
  removeDefaultMember: (screenFunctionId: number, memberId: number) =>
    api.delete(`/screen-functions/${screenFunctionId}/default-members/${memberId}`),
};


// Member APIs
export const memberApi = {
  getAll: () => api.get<Member[]>('/members'),
  getByProject: (projectId: number) => api.get<Member[]>(`/members/project/${projectId}`),
  getByProjectWithUser: (projectId: number) => api.get<Member[]>(`/members/project/${projectId}/with-user`),
  getOne: (id: number) => api.get<Member>(`/members/${id}`),
  create: (data: Partial<Member>) => api.post<Member>('/members', data),
  update: (id: number, data: Partial<Member>) => api.put<Member>(`/members/${id}`, data),
  delete: (id: number) => api.delete(`/members/${id}`),
  getSummary: (projectId: number) => api.get<MemberSummary>(`/members/project/${projectId}/summary`),
  getMemberWorkload: (memberId: number) => api.get<MemberWorkload>(`/members/${memberId}/workload`),
  getProjectWorkload: (projectId: number) => api.get<MemberWorkload[]>(`/members/project/${projectId}/workload`),
  copyFromProject: (data: { sourceProjectId: number; targetProjectId: number; memberIds: number[] }) =>
    api.post<{ copied: number; skipped: number; members: Member[] }>('/members/copy', data),
  // Member-User linking
  getLinkableUsers: () => api.get<LinkableUser[]>('/members/linkable-users'),
  linkToUser: (memberId: number, userId: number | null) =>
    api.put<Member>(`/members/${memberId}/link-user`, { userId }),
  // Todo list for current user
  getMyProjects: () => api.get<MyProjectMember[]>('/members/my-projects'),
  getMyTodoList: () => api.get<TodoItem[]>('/members/my-todo'),
};

// Task Workflow APIs
export const taskWorkflowApi = {
  // Workflow Stages
  getStages: (projectId: number) =>
    api.get<WorkflowStage[]>(`/task-workflow/stages/project/${projectId}`),
  createStage: (data: { projectId: number; name: string; displayOrder?: number; color?: string }) =>
    api.post<WorkflowStage>('/task-workflow/stages', data),
  updateStage: (id: number, data: {
    name?: string;
    displayOrder?: number;
    isActive?: boolean;
    color?: string;
    startDate?: string;
    endDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    estimatedEffort?: number;
    actualEffort?: number;
    progress?: number;
    status?: 'Good' | 'Warning' | 'At Risk';
  }) =>
    api.put<WorkflowStage>(`/task-workflow/stages/${id}`, data),
  deleteStage: (id: number) => api.delete(`/task-workflow/stages/${id}`),
  reorderStages: (stageOrders: Array<{ id: number; displayOrder: number }>) =>
    api.put('/task-workflow/stages/reorder', { stageOrders }),

  // Stage Detail
  getStageDetail: (stageId: number) =>
    api.get<StageDetailData>(`/task-workflow/stages/${stageId}/detail`),
  getStagesOverview: (projectId: number) =>
    api.get<StageOverviewData[]>(`/task-workflow/stages/overview/project/${projectId}`),
  getScreenFunctionStageStats: (projectId: number) =>
    api.get<StageSFStat[]>(`/task-workflow/stages/screen-function-stats/project/${projectId}`),
  quickLinkByType: (stageId: number, type: string, assignMembers?: boolean) =>
    api.post<{ created: number; skipped: number; membersAssigned: number; details: Array<{ stepId: number; stepName: string; linked: number; membersAssigned: number }> }>(
      `/task-workflow/stages/${stageId}/quick-link`, { type, assignMembers }
    ),

  // Workflow Steps
  getSteps: (stageId: number) =>
    api.get<WorkflowStep[]>(`/task-workflow/steps/stage/${stageId}`),
  createStep: (data: { stageId: number; name: string; displayOrder?: number }) =>
    api.post<WorkflowStep>('/task-workflow/steps', data),
  bulkCreateSteps: (data: { stageId: number; stepNames: string[] }) =>
    api.post<WorkflowStep[]>('/task-workflow/steps/bulk', data),
  updateStep: (id: number, data: { name?: string; displayOrder?: number; isActive?: boolean }) =>
    api.put<WorkflowStep>(`/task-workflow/steps/${id}`, data),
  deleteStep: (id: number) => api.delete(`/task-workflow/steps/${id}`),
  reorderSteps: (stepOrders: Array<{ id: number; displayOrder: number }>) =>
    api.put('/task-workflow/steps/reorder', { stepOrders }),
  getAvailableScreenFunctions: (stepId: number) =>
    api.get<ScreenFunction[]>(`/task-workflow/steps/${stepId}/available-screen-functions`),

  // Step Screen Functions
  getStepScreenFunctions: (stepId: number) =>
    api.get<StepScreenFunction[]>(`/task-workflow/step-screen-functions/step/${stepId}`),
  createStepScreenFunction: (data: {
    stepId: number;
    screenFunctionId: number;
    estimatedEffort?: number;
    actualEffort?: number;
    progress?: number;
    status?: 'Not Started' | 'In Progress' | 'Completed' | 'Skipped';
    note?: string;
  }) =>
    api.post<StepScreenFunction>('/task-workflow/step-screen-functions', data),
  updateStepScreenFunction: (id: number, data: {
    estimatedEffort?: number;
    actualEffort?: number;
    progress?: number;
    status?: 'Not Started' | 'In Progress' | 'Completed' | 'Skipped';
    note?: string;
    estimatedStartDate?: string;
    estimatedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
  }) =>
    api.put<StepScreenFunction>(`/task-workflow/step-screen-functions/${id}`, data),
  deleteStepScreenFunction: (id: number) =>
    api.delete(`/task-workflow/step-screen-functions/${id}`),
  bulkCreateStepScreenFunctions: (data: {
    stepId: number;
    items: Array<{ screenFunctionId: number; estimatedEffort?: number; note?: string }>
  }) =>
    api.post<StepScreenFunction[]>('/task-workflow/step-screen-functions/bulk', data),
  bulkUpdateStepScreenFunctions: (items: Array<{
    id: number;
    estimatedEffort?: number;
    actualEffort?: number;
    progress?: number;
    status?: 'Not Started' | 'In Progress' | 'Completed' | 'Skipped';
    note?: string;
  }>) =>
    api.put<StepScreenFunction[]>('/task-workflow/step-screen-functions/bulk', { items }),

  // Step Screen Function Members
  getStepScreenFunctionMembers: (stepScreenFunctionId: number) =>
    api.get(`/task-workflow/step-screen-function-members/ssf/${stepScreenFunctionId}`),
  createStepScreenFunctionMember: (data: {
    stepScreenFunctionId: number;
    memberId: number;
    estimatedEffort?: number;
    actualEffort?: number;
    progress?: number;
    estimatedStartDate?: string;
    estimatedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    note?: string;
  }) =>
    api.post('/task-workflow/step-screen-function-members', data),
  updateStepScreenFunctionMember: (id: number, data: {
    memberId?: number;
    estimatedEffort?: number;
    actualEffort?: number;
    progress?: number;
    estimatedStartDate?: string;
    estimatedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    note?: string;
  }) =>
    api.put(`/task-workflow/step-screen-function-members/${id}`, data),
  deleteStepScreenFunctionMember: (id: number) =>
    api.delete(`/task-workflow/step-screen-function-members/${id}`),
  bulkCreateStepScreenFunctionMembers: (data: {
    stepScreenFunctionId: number;
    items: Array<{
      memberId: number;
      estimatedEffort?: number;
      actualEffort?: number;
      progress?: number;
      estimatedStartDate?: string;
      estimatedEndDate?: string;
      actualStartDate?: string;
      actualEndDate?: string;
      note?: string;
    }>
  }) =>
    api.post('/task-workflow/step-screen-function-members/bulk', data),

  // Task Workflow
  getProjectWorkflow: (projectId: number, filter?: { screenName?: string; stageId?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filter?.screenName) params.append('screenName', filter.screenName);
    if (filter?.stageId) params.append('stageId', filter.stageId.toString());
    if (filter?.status) params.append('status', filter.status);
    const queryString = params.toString();
    return api.get<ProjectWorkflowData>(`/task-workflow/project/${projectId}${queryString ? `?${queryString}` : ''}`);
  },
  toggleTaskWorkflow: (data: { screenFunctionId: number; stepId: number; isCompleted: boolean; completedBy?: number; note?: string }) =>
    api.post<TaskWorkflow>('/task-workflow/toggle', data),
  bulkToggleTaskWorkflow: (items: Array<{ screenFunctionId: number; stepId: number; isCompleted: boolean; completedBy?: number }>) =>
    api.put<TaskWorkflow[]>('/task-workflow/bulk-toggle', { items }),
  updateNote: (id: number, data: { note?: string; completedBy?: number }) =>
    api.put<TaskWorkflow>(`/task-workflow/${id}/note`, data),

  // Initialize workflow for project
  initializeWorkflow: (projectId: number) =>
    api.post<{ stages: WorkflowStage[]; steps: WorkflowStep[] }>('/task-workflow/initialize', { projectId, useDefaultTemplate: true }),

  // Progress
  getProjectProgress: (projectId: number) =>
    api.get<ProjectWorkflowProgress>(`/task-workflow/progress/project/${projectId}`),
  getScreenFunctionProgress: (screenFunctionId: number) =>
    api.get<TaskWorkflowProgress>(`/task-workflow/progress/screen-function/${screenFunctionId}`),

  // Configuration
  getConfiguration: (projectId: number) =>
    api.get<{ stages: Array<WorkflowStage & { steps: WorkflowStep[] }> }>(`/task-workflow/configuration/project/${projectId}`),

  // Export
  exportExcel: (projectId: number) =>
    api.get(`/task-workflow/export/${projectId}`, { responseType: 'blob' }),

  // ===== Metric Types =====
  getMetricTypes: (projectId: number) =>
    api.get<MetricType[]>(`/task-workflow/metric-types/project/${projectId}`),
  getMetricType: (id: number) =>
    api.get<MetricType>(`/task-workflow/metric-types/${id}`),
  getProjectMetricInsights: (projectId: number) =>
    api.get<ProjectMetricInsights>(`/task-workflow/metrics/project/${projectId}`),
  getProjectMetricTypeSummary: (projectId: number) =>
    api.get<ProjectMetricTypeSummary>(`/task-workflow/metrics/project/${projectId}/type-summary`),
  createMetricType: (data: { projectId: number; name: string; description?: string; displayOrder?: number }) =>
    api.post<MetricType>('/task-workflow/metric-types', data),
  updateMetricType: (id: number, data: { name?: string; description?: string; displayOrder?: number; isActive?: boolean }) =>
    api.put<MetricType>(`/task-workflow/metric-types/${id}`, data),
  deleteMetricType: (id: number) =>
    api.delete(`/task-workflow/metric-types/${id}`),
  initializeProjectMetrics: (projectId: number) =>
    api.post<{ metricTypes: MetricType[] }>('/task-workflow/metric-types/initialize', { projectId }),

  // ===== Metric Categories =====
  getMetricCategories: (metricTypeId: number) =>
    api.get<MetricCategory[]>(`/task-workflow/metric-categories/type/${metricTypeId}`),
  getMetricCategory: (id: number) =>
    api.get<MetricCategory>(`/task-workflow/metric-categories/${id}`),
  createMetricCategory: (data: { metricTypeId: number; name: string; description?: string; displayOrder?: number }) =>
    api.post<MetricCategory>('/task-workflow/metric-categories', data),
  updateMetricCategory: (id: number, data: { name?: string; description?: string; displayOrder?: number; isActive?: boolean }) =>
    api.put<MetricCategory>(`/task-workflow/metric-categories/${id}`, data),
  deleteMetricCategory: (id: number) =>
    api.delete(`/task-workflow/metric-categories/${id}`),

  // ===== Task Member Metrics =====
  getTaskMemberMetrics: (stepScreenFunctionMemberId: number) =>
    api.get<TaskMemberMetric[]>(`/task-workflow/task-member-metrics/member/${stepScreenFunctionMemberId}`),
  getTaskMemberMetric: (id: number) =>
    api.get<TaskMemberMetric>(`/task-workflow/task-member-metrics/${id}`),
  createTaskMemberMetric: (data: { stepScreenFunctionMemberId: number; metricCategoryId: number; value?: number; note?: string }) =>
    api.post<TaskMemberMetric>('/task-workflow/task-member-metrics', data),
  updateTaskMemberMetric: (id: number, data: { value?: number; note?: string }) =>
    api.put<TaskMemberMetric>(`/task-workflow/task-member-metrics/${id}`, data),
  deleteTaskMemberMetric: (id: number) =>
    api.delete(`/task-workflow/task-member-metrics/${id}`),
  bulkUpsertTaskMemberMetrics: (data: {
    stepScreenFunctionMemberId: number;
    metrics: Array<{ metricCategoryId: number; value?: number; note?: string }>;
  }) =>
    api.post<TaskMemberMetric[]>('/task-workflow/task-member-metrics/bulk-upsert', data),

  // ===== AI Scheduling =====
  aiEstimateEffort: (data: { projectId: number; screenFunctionIds?: number[]; stageId?: number; language?: string }) =>
    api.post('/task-workflow/ai/estimate-effort', data),
  aiEstimateStageEffort: (data: { projectId: number; stageIds?: number[]; language?: string }) =>
    api.post('/task-workflow/ai/estimate-stage-effort', data),
  aiGenerateSchedule: (data: { projectId: number; stageId: number; language?: string }) =>
    api.post('/task-workflow/ai/generate-schedule', data),
  aiApplyEstimation: (data: { projectId: number; estimates: Array<{ screenFunctionId: number; estimatedEffortHours: number }> }) =>
    api.post('/task-workflow/ai/apply-estimation', data),
  aiApplyStageEstimation: (data: { projectId: number; estimates: Array<{ stageId: number; estimatedEffortHours: number; startDate?: string; endDate?: string }> }) =>
    api.post('/task-workflow/ai/apply-stage-estimation', data),
  aiApplySchedule: (data: { assignments: Array<{ stepScreenFunctionId: number; memberId: number; estimatedEffort: number; estimatedStartDate: string; estimatedEndDate: string }> }) =>
    api.post('/task-workflow/ai/apply-schedule', data),

  // Plan All: one-click AI estimation + scheduling for entire project
  aiPlanAll: (data: { projectId: number; language?: string; autoApply?: boolean }) =>
    api.post('/task-workflow/ai/plan-all', data),
};

export const iamApi = {
  listPermissions: () => api.get<Permission[]>('/iam/permissions'),
  listRoles: () => api.get<Role[]>('/iam/roles'),
  createRole: (data: { name: string; permissionKeys: string[] }) =>
    api.post<Role>('/iam/roles', data),
  updateRole: (id: number, data: { name?: string; permissionKeys?: string[] }) =>
    api.put<Role>(`/iam/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/iam/roles/${id}`),
  listPositions: () => api.get<Position[]>('/iam/positions'),
  createPosition: (data: { name: string; roleIds: number[] }) =>
    api.post<Position>('/iam/positions', data),
  updatePosition: (id: number, data: { name?: string; roleIds?: number[] }) =>
    api.put<Position>(`/iam/positions/${id}`, data),
  deletePosition: (id: number) => api.delete(`/iam/positions/${id}`),
  listUsers: () => api.get<User[]>('/iam/users'),
  createUser: (data: {
    username: string;
    email?: string;
    positionId: number;
    passwordMode: 'default' | 'email';
    mustChangePassword?: boolean;
  }) =>
    api.post<User>('/iam/users', data),
  updateUser: (id: number, data: { username?: string; email?: string; positionId?: number; mustChangePassword?: boolean }) =>
    api.put<User>(`/iam/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/iam/users/${id}`),
};

export default api;
