import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { taskWorkflowApi, projectApi, memberApi } from "@/services/api";
import {
  Card,
  LoadingSpinner,
  ProgressBar,
  Button,
  Tooltip,
} from "@/components/common";
import { useTranslation } from "react-i18next";
import type { StepScreenFunctionStatus, StepScreenFunction, ScreenFunctionType } from "@/types";
import { screenFunctionApi } from "@/services/api";
import { StageScreenFunctionTable } from "@/views/stage/StageScreenFunctionTable";
import { StageModals } from "@/views/stage/StageModals";

export const Route = createFileRoute("/projects_/$projectId/stages/$stageId")({
  component: StageDetail,
});

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
  const [ssfDateUpdates, setSsfDateUpdates] = useState<Array<{ id: number; actualStartDate?: string; actualEndDate?: string; hasEstStart: boolean; hasEstEnd: boolean; actualEffort: number; hasEstEffort: boolean }>>([]);
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

  // Update stage actual dates mutation (also syncs SSF dates from members)
  const updateStageDatesMutation = useMutation({
    mutationFn: async (data: {
      actualStartDate?: string;
      actualEndDate?: string;
      syncEstStep: boolean;
      syncEstStage: boolean;
      syncEstEffortStep: boolean;
      syncEstEffortStage: boolean;
      syncOverrideEst: boolean;
    }) => {
      // Step 1: update each SSF with member-derived actual dates + optional est dates/effort
      await Promise.all(
        ssfDateUpdates.map((u) => {
          const payload: {
            actualStartDate?: string;
            actualEndDate?: string;
            estimatedStartDate?: string;
            estimatedEndDate?: string;
            estimatedEffort?: number;
          } = {
            actualStartDate: u.actualStartDate,
            actualEndDate: u.actualEndDate,
          };
          if (data.syncEstStep) {
            if (data.syncOverrideEst || !u.hasEstStart) payload.estimatedStartDate = u.actualStartDate;
            if (data.syncOverrideEst || !u.hasEstEnd) payload.estimatedEndDate = u.actualEndDate;
          }
          if (data.syncEstEffortStep) {
            if (data.syncOverrideEst || !u.hasEstEffort) payload.estimatedEffort = u.actualEffort;
          }
          return taskWorkflowApi.updateStepScreenFunction(u.id, payload);
        })
      );
      // Step 2: update stage actual + optional est dates/effort
      const stagePayload: {
        actualStartDate?: string;
        actualEndDate?: string;
        startDate?: string;
        endDate?: string;
        estimatedEffort?: number;
      } = {
        actualStartDate: data.actualStartDate,
        actualEndDate: data.actualEndDate,
      };
      if (data.syncEstStage) {
        if (data.syncOverrideEst || !stage.startDate) stagePayload.startDate = data.actualStartDate;
        if (data.syncOverrideEst || !stage.endDate) stagePayload.endDate = data.actualEndDate;
      }
      if (data.syncEstEffortStage) {
        if (data.syncOverrideEst || !stage.estimatedEffort) stagePayload.estimatedEffort = stage.actualEffort;
      }
      return taskWorkflowApi.updateStage(parseInt(stageId), stagePayload);
    },
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
    const updates: Array<{ id: number; actualStartDate?: string; actualEndDate?: string; hasEstStart: boolean; hasEstEnd: boolean; actualEffort: number; hasEstEffort: boolean }> = [];

    // Iterate through all steps and screen functions
    stageDetail.steps.forEach(step => {
      step.screenFunctions?.forEach((ssf: any) => {
        // Calculate dates from members for each SSF
        let ssfMin: string | null = null;
        let ssfMax: string | null = null;
        ssf.members?.forEach((m: any) => {
          if (m.actualStartDate && (!ssfMin || m.actualStartDate < ssfMin)) ssfMin = m.actualStartDate;
          if (m.actualEndDate && (!ssfMax || m.actualEndDate > ssfMax)) ssfMax = m.actualEndDate;
        });
        // Fall back to ssf's own dates if no member dates
        const effectiveStart = ssfMin || ssf.actualStartDate || null;
        const effectiveEnd = ssfMax || ssf.actualEndDate || null;

        if (ssfMin || ssfMax) {
          updates.push({
            id: ssf.id,
            actualStartDate: ssfMin || undefined,
            actualEndDate: ssfMax || undefined,
            hasEstStart: !!ssf.estimatedStartDate,
            hasEstEnd: !!ssf.estimatedEndDate,
            actualEffort: ssf.actualEffort || 0,
            hasEstEffort: (ssf.estimatedEffort || 0) > 0,
          });
        }

        if (effectiveStart && (!minStartDate || effectiveStart < minStartDate)) minStartDate = effectiveStart;
        if (effectiveEnd && (!maxEndDate || effectiveEnd > maxEndDate)) maxEndDate = effectiveEnd;
      });
    });

    setSsfDateUpdates(updates);
    setCalculatedDates({ start: minStartDate, end: maxEndDate });
    setShowUpdateActualDateConfirm(true);
  };

  const confirmUpdateActualDate = (opts: { syncEstStep: boolean; syncEstStage: boolean; syncEstEffortStep: boolean; syncEstEffortStage: boolean; syncOverrideEst: boolean }) => {
    updateStageDatesMutation.mutate({
      actualStartDate: calculatedDates.start || undefined,
      actualEndDate: calculatedDates.end || undefined,
      ...opts,
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
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors group"
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
                  className="text-primary hover:text-primary-dark font-medium"
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
                      ? "border-primary text-primary"
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

              <StageScreenFunctionTable
                activeStep={activeStep}
                sortOrder={sortOrder}
                sortScreenFunctions={sortScreenFunctions}
                toggleSort={toggleSort}
                quickEditId={quickEditId}
                quickEditDraft={quickEditDraft}
                setQuickEditDraft={setQuickEditDraft}
                saveQuickEdit={saveQuickEdit}
                cancelQuickEdit={cancelQuickEdit}
                startQuickEdit={startQuickEdit}
                copyOutputText={copyOutputText}
                copiedId={copiedId}
                unlinkMutation={unlinkMutation}
                setEditingSSF={setEditingSSF}
                setShowLinkScreenFunction={setShowLinkScreenFunction}
                updateMutation={updateMutation}
              />
            </>
          )}
        </>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">{t('stages.noSteps')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('stages.configureStepsFirst')}</p>
          </div>
        </Card>
      )}

      <StageModals
        showLinkScreenFunction={showLinkScreenFunction}
        setShowLinkScreenFunction={(show) => {
          setShowLinkScreenFunction(show);
          if (!show) setSelectedSFIds([]);
        }}
        availableScreenFunctions={availableScreenFunctions}
        selectedSFIds={selectedSFIds}
        toggleSFSelection={toggleSFSelection}
        handleLinkScreenFunctions={handleLinkScreenFunctions}
        linkMutation={linkMutation}
        editingSSF={editingSSF}
        setEditingSSF={setEditingSSF}
        members={members}
        projectId={projectId}
        invalidateStageQueries={invalidateStageQueries}
        showUpdateActualDateConfirm={showUpdateActualDateConfirm}
        setShowUpdateActualDateConfirm={setShowUpdateActualDateConfirm}
        stage={stage}
        calculatedDates={calculatedDates}
        updateStageDatesMutation={updateStageDatesMutation}
        confirmUpdateActualDate={confirmUpdateActualDate}
        showQuickLink={showQuickLink}
        setShowQuickLink={setShowQuickLink}
        quickLinkType={quickLinkType}
        setQuickLinkType={setQuickLinkType}
        quickLinkResult={quickLinkResult}
        setQuickLinkResult={setQuickLinkResult}
        sfSummary={sfSummary}
        defaultMembers={defaultMembers}
        quickLinkAssignMembers={quickLinkAssignMembers}
        setQuickLinkAssignMembers={setQuickLinkAssignMembers}
        handleQuickLink={handleQuickLink}
        quickLinkMutation={quickLinkMutation}
        steps={steps}
      />
    </div>
  );
}
