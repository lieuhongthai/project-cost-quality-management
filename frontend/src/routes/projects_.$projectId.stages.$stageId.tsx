import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { taskWorkflowApi, projectApi, memberApi } from "@/services/api";
import {
  Card,
  LoadingSpinner,
  ProgressBar,
  Button,
  Modal,
  EmptyState,
  Tooltip,
  Select,
} from "@/components/common";
import { StepScreenFunctionEditModal } from "@/components/task-workflow";
import { useTranslation } from "react-i18next";
import type { StepScreenFunctionStatus, StepScreenFunction, ScreenFunctionType } from "@/types";
import { screenFunctionApi } from "@/services/api";

export const Route = createFileRoute("/projects_/$projectId/stages/$stageId")({
  component: StageDetail,
});

// Icon components
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const QuickEditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);

const UnlinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function StageDetail() {
  const { t } = useTranslation();
  const { projectId, stageId } = Route.useParams();
  const queryClient = useQueryClient();

  // State
  const [activeStepId, setActiveStepId] = useState<number | null>(null);
  const [showLinkScreenFunction, setShowLinkScreenFunction] = useState(false);
  const [selectedSFIds, setSelectedSFIds] = useState<number[]>([]);
  const [editingSSF, setEditingSSF] = useState<any | null>(null);
  const [quickEditId, setQuickEditId] = useState<number | null>(null);
  const [quickEditDraft, setQuickEditDraft] = useState<{
    status: StepScreenFunctionStatus;
    progress: number;
    estimatedEffort: number;
    actualEffort: number;
  } | null>(null);
  const [showUpdateActualDateConfirm, setShowUpdateActualDateConfirm] = useState(false);
  const [calculatedDates, setCalculatedDates] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("asc");
  const [showQuickLink, setShowQuickLink] = useState(false);
  const [quickLinkType, setQuickLinkType] = useState<ScreenFunctionType>('Screen');
  const [quickLinkAssignMembers, setQuickLinkAssignMembers] = useState(false);
  const [quickLinkResult, setQuickLinkResult] = useState<{ created: number; skipped: number; membersAssigned: number; details: Array<{ stepId: number; stepName: string; linked: number; membersAssigned: number }> } | null>(null);

  // Fetch stage detail
  const { data: stageDetail, isLoading } = useQuery({
    queryKey: ['stageDetail', parseInt(stageId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStageDetail(parseInt(stageId));
      return response.data;
    },
  });

  // Set active step to first step when data loads
  if (stageDetail && stageDetail.steps.length > 0 && activeStepId === null) {
    setActiveStepId(stageDetail.steps[0].id);
  }

  // Fetch project for breadcrumb
  const { data: project } = useQuery({
    queryKey: ['project', parseInt(projectId)],
    queryFn: async () => {
      const response = await projectApi.getOne(parseInt(projectId));
      return response.data;
    },
  });

  // Fetch members for assignee dropdown
  const { data: members } = useQuery({
    queryKey: ['members', parseInt(projectId)],
    queryFn: async () => {
      const response = await memberApi.getByProject(parseInt(projectId));
      return response.data;
    },
  });

  const { data: projectMetricInsights } = useQuery({
    queryKey: ['projectMetricInsights', parseInt(projectId)],
    queryFn: async () => {
      const response = await taskWorkflowApi.getProjectMetricInsights(parseInt(projectId));
      return response.data;
    },
  });

  // Fetch screen function summary for quick link counts
  const { data: sfSummary } = useQuery({
    queryKey: ['screenFunctionSummary', parseInt(projectId)],
    queryFn: async () => {
      const response = await screenFunctionApi.getSummary(parseInt(projectId));
      return response.data;
    },
    enabled: showQuickLink,
  });

  // Fetch available screen functions for linking
  const { data: availableScreenFunctions } = useQuery({
    queryKey: ['availableScreenFunctions', activeStepId],
    queryFn: async () => {
      if (!activeStepId) return [];
      const response = await taskWorkflowApi.getAvailableScreenFunctions(activeStepId);
      return response.data;
    },
    enabled: !!activeStepId && showLinkScreenFunction,
  });

  // Helper to invalidate related queries
  const invalidateStageQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['stageDetail', parseInt(stageId)] });
    queryClient.invalidateQueries({ queryKey: ['stagesOverview', parseInt(projectId)] });
  };

  // Helper to sort screen functions by name
  const sortScreenFunctions = (screenFunctions: any[]) => {
    if (!sortOrder) return screenFunctions;
    return [...screenFunctions].sort((a, b) => {
      const nameA = (a.screenFunction?.name || '').toLowerCase();
      const nameB = (b.screenFunction?.name || '').toLowerCase();
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  };

  // Toggle sort order
  const toggleSort = () => {
    if (sortOrder === null) {
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortOrder(null);
    }
  };

  // Link screen functions mutation
  const linkMutation = useMutation({
    mutationFn: (data: { stepId: number; items: Array<{ screenFunctionId: number }> }) =>
      taskWorkflowApi.bulkCreateStepScreenFunctions(data),
    onSuccess: () => {
      invalidateStageQueries();
      queryClient.invalidateQueries({ queryKey: ['availableScreenFunctions', activeStepId] });
      setShowLinkScreenFunction(false);
      setSelectedSFIds([]);
    },
  });

  // Unlink screen function mutation
  const unlinkMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteStepScreenFunction(id),
    onSuccess: () => {
      invalidateStageQueries();
    },
  });

  // Update step screen function mutation (for quick edit)
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: Partial<StepScreenFunction> }) =>
      taskWorkflowApi.updateStepScreenFunction(data.id, data.payload),
    onSuccess: () => {
      invalidateStageQueries();
      setQuickEditId(null);
      setQuickEditDraft(null);
    },
  });

  // Update stage actual dates mutation
  const updateStageDatesMutation = useMutation({
    mutationFn: (data: { actualStartDate?: string; actualEndDate?: string }) =>
      taskWorkflowApi.updateStage(parseInt(stageId), data),
    onSuccess: () => {
      invalidateStageQueries();
      setShowUpdateActualDateConfirm(false);
    },
  });

  // Fetch default members count for quick link
  const { data: defaultMembers } = useQuery({
    queryKey: ['sfDefaultMembers', parseInt(projectId)],
    queryFn: async () => {
      const response = await screenFunctionApi.getDefaultMembersByProject(parseInt(projectId));
      return response.data;
    },
    enabled: showQuickLink,
  });

  // Quick link mutation
  const quickLinkMutation = useMutation({
    mutationFn: (data: { stageId: number; type: string; assignMembers: boolean }) =>
      taskWorkflowApi.quickLinkByType(data.stageId, data.type, data.assignMembers),
    onSuccess: (response) => {
      setQuickLinkResult(response.data);
      invalidateStageQueries();
      queryClient.invalidateQueries({ queryKey: ['availableScreenFunctions'] });
    },
  });

  const handleQuickLink = () => {
    quickLinkMutation.mutate({
      stageId: parseInt(stageId),
      type: quickLinkType,
      assignMembers: quickLinkAssignMembers,
    });
  };

  // Handle link screen functions
  const handleLinkScreenFunctions = () => {
    if (!activeStepId || selectedSFIds.length === 0) return;
    linkMutation.mutate({
      stepId: activeStepId,
      items: selectedSFIds.map(id => ({ screenFunctionId: id })),
    });
  };

  // Toggle screen function selection
  const toggleSFSelection = (sfId: number) => {
    setSelectedSFIds(prev =>
      prev.includes(sfId)
        ? prev.filter(id => id !== sfId)
        : [...prev, sfId]
    );
  };

  // Quick edit functions
  const startQuickEdit = (ssf: any) => {
    setQuickEditId(ssf.id);
    setQuickEditDraft({
      status: ssf.status || 'Not Started',
      progress: ssf.progress || 0,
      estimatedEffort: ssf.estimatedEffort || 0,
      actualEffort: ssf.actualEffort || 0,
    });
  };

  const cancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditDraft(null);
  };

  const saveQuickEdit = (ssfId: number) => {
    if (!quickEditDraft) return;
    updateMutation.mutate({
      id: ssfId,
      payload: {
        status: quickEditDraft.status,
        progress: quickEditDraft.progress,
      },
    });
  };

  // Copy output text to clipboard
  const copyOutputText = async (ssf: any, stepName: string) => {
    const projectName = project?.name || 'Project';
    const stageName = stageDetail?.stage.name || 'Stage';
    const screenFunctionName = ssf.screenFunction?.name || 'Unknown';

    const text = `[${projectName}] [${stageName}] [${stepName}] ${screenFunctionName}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(ssf.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Calculate and show update actual date confirmation
  const handleUpdateActualDate = () => {
    if (!stageDetail) return;

    let minStartDate: string | null = null;
    let maxEndDate: string | null = null;

    // Iterate through all steps and screen functions
    stageDetail.steps.forEach(step => {
      step.screenFunctions?.forEach((ssf: any) => {
        if (ssf.actualStartDate) {
          if (!minStartDate || ssf.actualStartDate < minStartDate) {
            minStartDate = ssf.actualStartDate;
          }
        }
        if (ssf.actualEndDate) {
          if (!maxEndDate || ssf.actualEndDate > maxEndDate) {
            maxEndDate = ssf.actualEndDate;
          }
        }
      });
    });

    setCalculatedDates({ start: minStartDate, end: maxEndDate });
    setShowUpdateActualDateConfirm(true);
  };

  const confirmUpdateActualDate = () => {
    updateStageDatesMutation.mutate({
      actualStartDate: calculatedDates.start || undefined,
      actualEndDate: calculatedDates.end || undefined,
    });
  };

  // Get status color class
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Good':
        return 'bg-green-100 text-green-800';
      case 'Warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'At Risk':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stageDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('stages.notFound')}</p>
      </div>
    );
  }

  const stageTestInsights = projectMetricInsights?.stages.find(
    (item) => item.stageId === parseInt(stageId),
  );

  const formatPercentValue = (value?: number, digits = 1) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return t('common.notAvailable');
    }
    return `${value.toFixed(digits)}%`;
  };

  const { stage, steps, progress, effort, status } = stageDetail;
  const activeStep = steps.find(s => s.id === activeStepId);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm mb-4">
        <Link
          to="/projects"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {t('nav.projects')}
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {project ? (
          <Link
            to="/projects/$projectId"
            params={{ projectId }}
            search={{ tab: 'overview' }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {project.name}
          </Link>
        ) : (
          <span className="text-gray-400">{t('common.loading')}</span>
        )}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">{stage.name}</span>
      </nav>

      {/* Back Button */}
      <div className="mb-4">
        <Link
          to="/projects/$projectId"
          params={{ projectId }}
          search={{ tab: 'stages' }}
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors group"
        >
          <svg
            className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('stages.backToProject', { project: project?.name || t('report.scopeProject') })}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{stage.name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick Link Button */}
            <Tooltip content={t('stages.quickLinkTooltip', { defaultValue: 'Auto-link Screen/Functions to all steps' })}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowQuickLink(true);
                  setQuickLinkResult(null);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="ml-2">{t('stages.quickLink', { defaultValue: 'Quick Link' })}</span>
              </Button>
            </Tooltip>
            {/* Update Actual Date Button */}
            <Tooltip content={t('stages.updateActualDateFromTasks')}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUpdateActualDate}
              >
                <RefreshIcon />
                <span className="ml-2">{t('stages.syncActualDates')}</span>
              </Button>
            </Tooltip>
            {project && (
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('report.scopeProject')}</p>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId }}
                  search={{ tab: 'overview' }}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {project.name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">{t('stages.progress')}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {progress.percentage}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {progress.completed} / {progress.total} {t('stages.tasksCompleted')}
            </p>
            <ProgressBar progress={progress.percentage} />
          </Card>

          <Card>
            <p className="text-sm text-gray-500">{t('stages.estimatedEffort')}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {effort.estimated}h
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">{t('stages.actualEffort')}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {effort.actual}h
            </p>
            {effort.variance !== 0 && (
              <p className={`text-xs mt-1 ${effort.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {effort.variance > 0 ? '+' : ''}{effort.variance}% {t('stages.variance')}
              </p>
            )}
          </Card>

          <Card>
            <p className="text-sm text-gray-500">{t('stages.schedule')}</p>
            <div className="mt-1 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('stages.start')}:</span>
                <span>{formatDate(stage.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('stages.end')}:</span>
                <span>{formatDate(stage.endDate)}</span>
              </div>
              <div className="border-t pt-1 mt-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('stages.actualStart')}:</span>
                  <span className={stage.actualStartDate ? 'text-green-600' : 'text-gray-400'}>
                    {formatDate(stage.actualStartDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('stages.actualEnd')}:</span>
                  <span className={stage.actualEndDate ? 'text-green-600' : 'text-gray-400'}>
                    {formatDate(stage.actualEndDate)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card title={t('metrics.testMetricsStage')}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t('metrics.bugRate')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stageTestInsights
                    ? formatPercentValue(stageTestInsights.bugRate * 100, 1)
                    : t('common.notAvailable')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t('metrics.testCasesPerMinute')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stageTestInsights
                    ? stageTestInsights.testCasesPerMinute.toFixed(2)
                    : t('common.notAvailable')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t('metrics.totalTestCases')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stageTestInsights
                    ? stageTestInsights.totalTestCases.toLocaleString()
                    : t('common.notAvailable')}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">{t('metrics.bugCount')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stageTestInsights
                    ? stageTestInsights.bugCount.toLocaleString()
                    : t('common.notAvailable')}
                </p>
                <p className="text-xs text-gray-400">
                  {stageTestInsights
                    ? t('metrics.actualMinutes', { value: stageTestInsights.actualMinutes.toFixed(0) })
                    : t('common.notAvailable')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Steps Tabs */}
      {steps.length > 0 ? (
        <>
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStepId(step.id)}
                  className={`${
                    activeStepId === step.id
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
                >
                  {step.name}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                    {step.screenFunctions?.length || 0}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Active Step Content */}
          {activeStep && (
            <>
              {/* Step Statistics */}
              {activeStep.statistics && (
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('stages.stepProgress')}</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {activeStep.statistics.progressPercentage}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {activeStep.statistics.completedTasks} / {activeStep.statistics.totalTasks} {t('stages.tasksCompleted')}
                    </p>
                    <ProgressBar progress={activeStep.statistics.progressPercentage} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('stages.stepEstEffort')}</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {activeStep.statistics.estimatedEffort}h
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('stages.stepActEffort')}</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {activeStep.statistics.actualEffort}h
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('stages.stepTasksCount')}</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">
                      {activeStep.statistics.totalTasks}
                    </p>
                  </div>
                </div>
              )}

              <Card
                title={`${activeStep.name} - ${t('stages.linkedScreenFunctions')}`}
                actions={
                  <Button size="sm" onClick={() => setShowLinkScreenFunction(true)}>
                    {t('stages.linkScreenFunction')}
                  </Button>
                }
              >
              {activeStep.screenFunctions && activeStep.screenFunctions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                          <button
                            type="button"
                            onClick={toggleSort}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            {t('screenFunction.name')}
                            <span className="text-xs">
                              {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : '↕'}
                            </span>
                          </button>
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {t('stages.assignedMembers')}
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {t('screenFunction.status')}
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {t('screenFunction.progress')}
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {t('stages.estEffort')}
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {t('stages.actEffort')}
                        </th>
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 w-36">
                          {t('common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortScreenFunctions(activeStep.screenFunctions).map((ssf: any) => {
                        const isQuickEditing = quickEditId === ssf.id;
                        const draft = isQuickEditing ? quickEditDraft : null;
                        const statusValue = draft ? draft.status : (ssf.status || 'Not Started');
                        const progressValue = draft ? draft.progress : (ssf.progress || 0);
                        const estimatedValue = draft ? draft.estimatedEffort : (ssf.estimatedEffort || 0);
                        const actualValue = draft ? draft.actualEffort : (ssf.actualEffort || 0);

                        return (
                          <tr key={ssf.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                              <p className="font-medium text-gray-900">
                                {ssf.screenFunction?.name || t('common.unknown')}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  ssf.screenFunction?.type === 'Screen'
                                    ? 'bg-purple-100 text-purple-800'
                                    : ssf.screenFunction?.type === 'Function'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {ssf.screenFunction?.type || '-'}
                                </span>
                                {ssf.note && (
                                  <Tooltip content={ssf.note}>
                                    <span className="text-xs text-gray-400 cursor-help">
                                      (note)
                                    </span>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {ssf.members && ssf.members.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {ssf.members.slice(0, 2).map((m: any) => (
                                    <span key={m.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                      {m.member?.name || t('common.unknown')}
                                    </span>
                                  ))}
                                  {ssf.members.length > 2 && (
                                    <Tooltip content={ssf.members.slice(2).map((m: any) => m.member?.name).join(', ')}>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 cursor-help">
                                        +{ssf.members.length - 2}
                                      </span>
                                    </Tooltip>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">{t('stages.noMembersAssigned')}</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {isQuickEditing ? (
                                <Select
                                  value={statusValue}
                                  onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                                    ...prev,
                                    status: e.target.value as StepScreenFunctionStatus,
                                  }) : prev)}
                                  options={[
                                    { value: 'Not Started', label: t('screenFunction.statusNotStarted') },
                                    { value: 'In Progress', label: t('screenFunction.statusInProgress') },
                                    { value: 'Completed', label: t('screenFunction.statusCompleted') },
                                    { value: 'Skipped', label: t('screenFunction.statusSkipped') },
                                  ]}
                                  size="small"
                                />
                              ) : (
                                <span className={`px-2 py-1 text-xs rounded ${
                                  statusValue === 'Completed' ? 'bg-green-100 text-green-800' :
                                  statusValue === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                  statusValue === 'Skipped' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {statusValue}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {isQuickEditing ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={progressValue}
                                  onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                                    ...prev,
                                    progress: Number(e.target.value),
                                  }) : prev)}
                                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                />
                              ) : (
                                <div className="w-20">
                                  <ProgressBar progress={progressValue} showLabel />
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {estimatedValue}h
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {actualValue}h
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <div className="flex items-center justify-center gap-1">
                                {isQuickEditing ? (
                                  <>
                                    <Tooltip content={t('common.save')}>
                                      <button
                                        onClick={() => saveQuickEdit(ssf.id)}
                                        disabled={updateMutation.isPending}
                                        className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                                      >
                                        <CheckIcon />
                                      </button>
                                    </Tooltip>
                                    <Tooltip content={t('common.cancel')}>
                                      <button
                                        onClick={cancelQuickEdit}
                                        className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                                      >
                                        <XIcon />
                                      </button>
                                    </Tooltip>
                                  </>
                                ) : (
                                  <>
                                    <Tooltip content={t('stages.outputText')}>
                                      <button
                                        onClick={() => copyOutputText(ssf, activeStep.name)}
                                        className={`p-1.5 rounded-md transition-colors ${
                                          copiedId === ssf.id
                                            ? 'text-green-600 bg-green-50'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                      >
                                        <CopyIcon />
                                      </button>
                                    </Tooltip>
                                    <Tooltip content={t('stages.quickEdit')}>
                                      <button
                                        onClick={() => startQuickEdit(ssf)}
                                        className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                      >
                                        <QuickEditIcon />
                                      </button>
                                    </Tooltip>
                                    <Tooltip content={t('common.edit')}>
                                      <button
                                        onClick={() => setEditingSSF(ssf)}
                                        className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                                      >
                                        <EditIcon />
                                      </button>
                                    </Tooltip>
                                    <Tooltip content={t('stages.unlink')}>
                                      <button
                                        onClick={() => {
                                          if (confirm(t('stages.unlinkConfirm'))) {
                                            unlinkMutation.mutate(ssf.id);
                                          }
                                        }}
                                        className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <UnlinkIcon />
                                      </button>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title={t('stages.noLinkedScreenFunctions')}
                  description={t('stages.linkScreenFunctionsDescription')}
                  action={
                    <Button onClick={() => setShowLinkScreenFunction(true)}>
                      {t('stages.linkScreenFunction')}
                    </Button>
                  }
                />
              )}
              </Card>
            </>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            title={t('stages.noSteps')}
            description={t('stages.configureStepsFirst')}
          />
        </Card>
      )}

      {/* Link Screen Function Modal */}
      <Modal
        isOpen={showLinkScreenFunction}
        onClose={() => {
          setShowLinkScreenFunction(false);
          setSelectedSFIds([]);
        }}
        title={t('stages.linkScreenFunctionModalTitle')}
        size="lg"
      >
        <div className="space-y-4">
          {availableScreenFunctions && availableScreenFunctions.length > 0 ? (
            <>
              <p className="text-sm text-gray-500">
                {t('stages.linkScreenFunctionModalDescription')}
              </p>
              <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
                {availableScreenFunctions.map((sf) => (
                  <label
                    key={sf.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSFIds.includes(sf.id)}
                      onChange={() => toggleSFSelection(sf.id)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">{sf.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          sf.type === 'Screen' ? 'bg-purple-100 text-purple-800' :
                          sf.type === 'Function' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {sf.type}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          sf.priority === 'High' ? 'bg-red-100 text-red-800' :
                          sf.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sf.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {sf.complexity}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowLinkScreenFunction(false);
                    setSelectedSFIds([]);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleLinkScreenFunctions}
                  disabled={selectedSFIds.length === 0 || linkMutation.isPending}
                  loading={linkMutation.isPending}
                >
                  {selectedSFIds.length > 0
                    ? t('stages.linkWithCount', { count: selectedSFIds.length })
                    : t('stages.link')}
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              title={t('stages.noAvailableScreenFunctions')}
              description={t('stages.allScreenFunctionsLinked')}
            />
          )}
        </div>
      </Modal>

      {/* Edit Screen Function Modal */}
      {editingSSF && members && (
        <StepScreenFunctionEditModal
          data={editingSSF}
          members={members}
          projectId={parseInt(projectId)}
          onClose={(saved) => {
            setEditingSSF(null);
            if (saved) {
              invalidateStageQueries();
            }
          }}
        />
      )}

      {/* Update Actual Date Confirmation Modal */}
      <Modal
        isOpen={showUpdateActualDateConfirm}
        onClose={() => setShowUpdateActualDateConfirm(false)}
        title={t('stages.updateActualDateTitle')}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('stages.updateActualDateDescription')}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.currentActualStart')}:</span>
              <span className="font-medium">{formatDate(stage.actualStartDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.newActualStart')}:</span>
              <span className={`font-medium ${calculatedDates.start ? 'text-green-600' : 'text-gray-400'}`}>
                {formatDate(calculatedDates.start || undefined)}
              </span>
            </div>
            <div className="border-t my-2" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.currentActualEnd')}:</span>
              <span className="font-medium">{formatDate(stage.actualEndDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{t('stages.newActualEnd')}:</span>
              <span className={`font-medium ${calculatedDates.end ? 'text-green-600' : 'text-gray-400'}`}>
                {formatDate(calculatedDates.end || undefined)}
              </span>
            </div>
          </div>

          {!calculatedDates.start && !calculatedDates.end && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              {t('stages.noActualDatesFound')}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowUpdateActualDateConfirm(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={confirmUpdateActualDate}
              disabled={(!calculatedDates.start && !calculatedDates.end) || updateStageDatesMutation.isPending}
              loading={updateStageDatesMutation.isPending}
            >
              {t('stages.confirmUpdate')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Link Modal */}
      <Modal
        isOpen={showQuickLink}
        onClose={() => {
          setShowQuickLink(false);
          setQuickLinkResult(null);
        }}
        title={t('stages.quickLinkTitle', { defaultValue: 'Quick Link Screen/Functions' })}
        size="md"
      >
        <div className="space-y-4">
          {!quickLinkResult ? (
            <>
              <p className="text-sm text-gray-600">
                {t('stages.quickLinkDescription', {
                  defaultValue: 'Automatically link all Screen/Functions of a selected type to every step of this stage. Existing links will be skipped.',
                })}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('stages.quickLinkSelectType', { defaultValue: 'Select type to link' })}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Screen', 'Function', 'Other'] as ScreenFunctionType[]).map((type) => {
                    const count = sfSummary?.byType?.[type] ?? 0;
                    const isSelected = quickLinkType === type;
                    const colorMap: Record<string, string> = {
                      Screen: isSelected ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300',
                      Function: isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300',
                      Other: isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 hover:border-orange-300',
                    };
                    const badgeColor: Record<string, string> = {
                      Screen: 'bg-purple-100 text-purple-800',
                      Function: 'bg-blue-100 text-blue-800',
                      Other: 'bg-orange-100 text-orange-800',
                    };

                    return (
                      <button
                        key={type}
                        onClick={() => setQuickLinkType(type)}
                        className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${colorMap[type]}`}
                      >
                        <span className={`inline-block px-2 py-0.5 text-xs rounded mb-1 ${badgeColor[type]}`}>
                          {type}
                        </span>
                        <p className="text-lg font-semibold text-gray-900">{count}</p>
                        <p className="text-xs text-gray-500">{t('stages.items', { defaultValue: 'items' })}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {steps.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">
                    {t('stages.quickLinkPreview', { defaultValue: 'Preview' })}
                  </p>
                  <p className="text-sm text-gray-700">
                    {t('stages.quickLinkPreviewText', {
                      defaultValue: `${sfSummary?.byType?.[quickLinkType] ?? 0} ${quickLinkType}(s) × ${steps.length} step(s) = up to ${(sfSummary?.byType?.[quickLinkType] ?? 0) * steps.length} tasks`,
                      count: sfSummary?.byType?.[quickLinkType] ?? 0,
                      type: quickLinkType,
                      steps: steps.length,
                      total: (sfSummary?.byType?.[quickLinkType] ?? 0) * steps.length,
                    })}
                  </p>
                </div>
              )}

              {/* Assign Members Option */}
              {(() => {
                const sfIdsWithMembers = new Set(defaultMembers?.map(dm => dm.screenFunctionId) || []);
                const hasAnyDefaultMembers = sfIdsWithMembers.size > 0;

                return (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickLinkAssignMembers}
                        onChange={(e) => setQuickLinkAssignMembers(e.target.checked)}
                        className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t('stages.quickLinkAssignMembers', { defaultValue: 'Auto-assign default members' })}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {hasAnyDefaultMembers
                            ? t('stages.quickLinkAssignMembersDesc', {
                                defaultValue: 'Automatically assign default members configured in Screen/Functions tab to newly created tasks.',
                              })
                            : t('stages.quickLinkNoDefaultMembers', {
                                defaultValue: 'No default members configured. Go to Screen/Functions tab to assign default members first.',
                              })
                          }
                        </p>
                        {hasAnyDefaultMembers && (
                          <p className="text-xs text-indigo-600 mt-1">
                            {sfIdsWithMembers.size} {t('stages.sfWithAssignees', { defaultValue: 'Screen/Function(s) with default assignees' })}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowQuickLink(false);
                    setQuickLinkResult(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleQuickLink}
                  disabled={quickLinkMutation.isPending || (sfSummary?.byType?.[quickLinkType] ?? 0) === 0}
                  loading={quickLinkMutation.isPending}
                >
                  {t('stages.quickLinkAction', { defaultValue: `Link ${sfSummary?.byType?.[quickLinkType] ?? 0} ${quickLinkType}(s)` })}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {t('stages.quickLinkComplete', { defaultValue: 'Quick Link Complete' })}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('stages.quickLinkCreated', {
                    defaultValue: `Created ${quickLinkResult.created} new task(s), skipped ${quickLinkResult.skipped} existing`,
                    created: quickLinkResult.created,
                    skipped: quickLinkResult.skipped,
                  })}
                </p>
                {quickLinkResult.membersAssigned > 0 && (
                  <p className="text-sm text-indigo-600 mt-1">
                    {t('stages.quickLinkMembersAssigned', {
                      defaultValue: `${quickLinkResult.membersAssigned} member assignment(s) created`,
                      count: quickLinkResult.membersAssigned,
                    })}
                  </p>
                )}
              </div>

              {quickLinkResult.details.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    {t('stages.quickLinkDetails', { defaultValue: 'Details by step' })}
                  </p>
                  <div className="space-y-1">
                    {quickLinkResult.details.map((d) => (
                      <div key={d.stepId} className="flex justify-between text-sm">
                        <span className="text-gray-700">{d.stepName}</span>
                        <div className="flex gap-3">
                          <span className={d.linked > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            +{d.linked} {t('stages.tasks', { defaultValue: 'tasks' })}
                          </span>
                          {d.membersAssigned > 0 && (
                            <span className="text-indigo-600 font-medium">
                              +{d.membersAssigned} {t('stages.assignees', { defaultValue: 'assignees' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    setShowQuickLink(false);
                    setQuickLinkResult(null);
                  }}
                >
                  {t('common.close', { defaultValue: 'Close' })}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
