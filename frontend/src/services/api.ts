import axios from 'axios';
import type {
  Project,
  ProjectSettings,
  Phase,
  Effort,
  Testing,
  Report,
  Commentary,
  Metrics,
  EffortSummary,
  TestingSummary,
  ScreenFunction,
  PhaseScreenFunction,
  ScreenFunctionSummary,
  PhaseScreenFunctionSummary,
  ScreenFunctionWithPhases,
  Member,
  MemberSummary,
  MemberWorkload,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
};

// Phase APIs
export const phaseApi = {
  getAll: () => api.get<Phase[]>('/phases'),
  getByProject: (projectId: number) => api.get<Phase[]>(`/phases/project/${projectId}`),
  getOne: (id: number) => api.get<Phase>(`/phases/${id}`),
  create: (data: Partial<Phase>) => api.post<Phase>('/phases', data),
  update: (id: number, data: Partial<Phase>) => api.put<Phase>(`/phases/${id}`, data),
  delete: (id: number) => api.delete(`/phases/${id}`),
  reorder: (phaseOrders: Array<{ id: number; displayOrder: number }>) =>
    api.put('/phases/reorder', { phaseOrders }),
};

// Effort APIs
export const effortApi = {
  getAll: () => api.get<Effort[]>('/efforts'),
  getByPhase: (phaseId: number) => api.get<Effort[]>(`/efforts/phase/${phaseId}`),
  getByWeek: (phaseId: number, year: number, weekNumber: number) => 
    api.get<Effort>(`/efforts/phase/${phaseId}/week?year=${year}&weekNumber=${weekNumber}`),
  getOne: (id: number) => api.get<Effort>(`/efforts/${id}`),
  create: (data: Partial<Effort>) => api.post<Effort>('/efforts', data),
  bulkCreate: (data: { phaseId: number; efforts: Partial<Effort>[] }) => 
    api.post<Effort[]>('/efforts/bulk', data),
  update: (id: number, data: Partial<Effort>) => api.put<Effort>(`/efforts/${id}`, data),
  delete: (id: number) => api.delete(`/efforts/${id}`),
  getSummary: (phaseId: number) => api.get<EffortSummary>(`/efforts/phase/${phaseId}/summary`),
};

// Testing APIs
export const testingApi = {
  getAll: () => api.get<Testing[]>('/testing'),
  getByPhase: (phaseId: number) => api.get<Testing[]>(`/testing/phase/${phaseId}`),
  getOne: (id: number) => api.get<Testing>(`/testing/${id}`),
  create: (data: Partial<Testing>) => api.post<Testing>('/testing', data),
  update: (id: number, data: Partial<Testing>) => api.put<Testing>(`/testing/${id}`, data),
  delete: (id: number) => api.delete(`/testing/${id}`),
  getSummary: (phaseId: number) => api.get<TestingSummary>(`/testing/phase/${phaseId}/summary`),
};

// Report APIs
export const reportApi = {
  getAll: () => api.get<Report[]>('/reports'),
  getByProject: (projectId: number) => api.get<Report[]>(`/reports/project/${projectId}`),
  getByScope: (projectId: number, scope: string) => 
    api.get<Report[]>(`/reports/project/${projectId}/scope/${scope}`),
  getOne: (id: number) => api.get<Report>(`/reports/${id}`),
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
  calculatePhase: (phaseId: number, reportId: number) =>
    api.post<Metrics>(`/metrics/phase/${phaseId}?reportId=${reportId}`),
  calculateProject: (projectId: number, reportId: number) =>
    api.post<Metrics>(`/metrics/project/${projectId}?reportId=${reportId}`),
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
};

// Phase-ScreenFunction APIs
export const phaseScreenFunctionApi = {
  getAll: () => api.get<PhaseScreenFunction[]>('/phase-screen-functions'),
  getByPhase: (phaseId: number) => api.get<PhaseScreenFunction[]>(`/phase-screen-functions/phase/${phaseId}`),
  getByScreenFunction: (screenFunctionId: number) =>
    api.get<PhaseScreenFunction[]>(`/phase-screen-functions/screen-function/${screenFunctionId}`),
  getProjectWithPhases: (projectId: number) =>
    api.get<ScreenFunctionWithPhases[]>(`/phase-screen-functions/project/${projectId}/with-phases`),
  getOne: (id: number) => api.get<PhaseScreenFunction>(`/phase-screen-functions/${id}`),
  create: (data: Partial<PhaseScreenFunction>) => api.post<PhaseScreenFunction>('/phase-screen-functions', data),
  update: (id: number, data: Partial<PhaseScreenFunction>) =>
    api.put<PhaseScreenFunction>(`/phase-screen-functions/${id}`, data),
  delete: (id: number) => api.delete(`/phase-screen-functions/${id}`),
  bulkCreate: (data: { phaseId: number; items: Array<{ screenFunctionId: number; estimatedEffort?: number; note?: string }> }) =>
    api.post<PhaseScreenFunction[]>('/phase-screen-functions/bulk', data),
  bulkUpdate: (data: { items: Array<{ id: number; estimatedEffort?: number; actualEffort?: number; progress?: number; status?: string; note?: string }> }) =>
    api.put<PhaseScreenFunction[]>('/phase-screen-functions/bulk', data),
  getSummary: (phaseId: number) => api.get<PhaseScreenFunctionSummary>(`/phase-screen-functions/phase/${phaseId}/summary`),
};

// Member APIs
export const memberApi = {
  getAll: () => api.get<Member[]>('/members'),
  getByProject: (projectId: number) => api.get<Member[]>(`/members/project/${projectId}`),
  getOne: (id: number) => api.get<Member>(`/members/${id}`),
  create: (data: Partial<Member>) => api.post<Member>('/members', data),
  update: (id: number, data: Partial<Member>) => api.put<Member>(`/members/${id}`, data),
  delete: (id: number) => api.delete(`/members/${id}`),
  getSummary: (projectId: number) => api.get<MemberSummary>(`/members/project/${projectId}/summary`),
  getMemberWorkload: (memberId: number) => api.get<MemberWorkload>(`/members/${memberId}/workload`),
  getProjectWorkload: (projectId: number) => api.get<MemberWorkload[]>(`/members/project/${projectId}/workload`),
};

export default api;
