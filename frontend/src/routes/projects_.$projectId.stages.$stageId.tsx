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
} from "@/components/common";
import { StepScreenFunctionEditModal } from "@/components/task-workflow";
import { useTranslation } from "react-i18next";
import type { StepScreenFunctionStatus, StepScreenFunction } from "@/types";

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
    assigneeId: number | null;
    status: StepScreenFunctionStatus;
    progress: number;
    estimatedEffort: number;
    actualEffort: number;
  } | null>(null);
  const [showUpdateActualDateConfirm, setShowUpdateActualDateConfirm] = useState(false);
  const [calculatedDates, setCalculatedDates] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [copiedId, setCopiedId] = useState<number | null>(null);

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

  // Link screen functions mutation
  const linkMutation = useMutation({
    mutationFn: (data: { stepId: number; items: Array<{ screenFunctionId: number }> }) =>
      taskWorkflowApi.bulkCreateStepScreenFunctions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stageDetail', parseInt(stageId)] });
      queryClient.invalidateQueries({ queryKey: ['availableScreenFunctions', activeStepId] });
      setShowLinkScreenFunction(false);
      setSelectedSFIds([]);
    },
  });

  // Unlink screen function mutation
  const unlinkMutation = useMutation({
    mutationFn: (id: number) => taskWorkflowApi.deleteStepScreenFunction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stageDetail', parseInt(stageId)] });
    },
  });

  // Update step screen function mutation (for quick edit)
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: Partial<StepScreenFunction> }) =>
      taskWorkflowApi.updateStepScreenFunction(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stageDetail', parseInt(stageId)] });
      setQuickEditId(null);
      setQuickEditDraft(null);
    },
  });

  // Update stage actual dates mutation
  const updateStageDatesMutation = useMutation({
    mutationFn: (data: { actualStartDate?: string; actualEndDate?: string }) =>
      taskWorkflowApi.updateStage(parseInt(stageId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stageDetail', parseInt(stageId)] });
      setShowUpdateActualDateConfirm(false);
    },
  });

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
      assigneeId: ssf.assignee?.id ?? null,
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
        assigneeId: quickEditDraft.assigneeId ?? undefined,
        status: quickEditDraft.status,
        progress: quickEditDraft.progress,
        estimatedEffort: quickEditDraft.estimatedEffort,
        actualEffort: quickEditDraft.actualEffort,
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
              {progress.completed} / {progress.total} {t('stages.screensCompleted')}
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
                          {t('screenFunction.name')}
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          {t('screenFunction.assignee')}
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
                      {activeStep.screenFunctions.map((ssf: any) => {
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
                                    : 'bg-blue-100 text-blue-800'
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
                              {isQuickEditing ? (
                                <select
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                  value={draft?.assigneeId ?? ''}
                                  onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                                    ...prev,
                                    assigneeId: e.target.value ? Number(e.target.value) : null,
                                  }) : prev)}
                                >
                                  <option value="">{t('stages.unassigned')}</option>
                                  {members?.map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                ssf.assignee ? (
                                  <span className="text-gray-900">{ssf.assignee.name}</span>
                                ) : (
                                  <span className="text-gray-400">{t('stages.unassigned')}</span>
                                )
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {isQuickEditing ? (
                                <select
                                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                  value={statusValue}
                                  onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                                    ...prev,
                                    status: e.target.value as StepScreenFunctionStatus,
                                  }) : prev)}
                                >
                                  <option value="Not Started">{t('screenFunction.statusNotStarted')}</option>
                                  <option value="In Progress">{t('screenFunction.statusInProgress')}</option>
                                  <option value="Completed">{t('screenFunction.statusCompleted')}</option>
                                  <option value="Skipped">{t('screenFunction.statusSkipped')}</option>
                                </select>
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
                              {isQuickEditing ? (
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={estimatedValue}
                                  onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                                    ...prev,
                                    estimatedEffort: Number(e.target.value),
                                  }) : prev)}
                                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                />
                              ) : (
                                <>{estimatedValue}h</>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {isQuickEditing ? (
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={actualValue}
                                  onChange={(e) => setQuickEditDraft((prev) => prev ? ({
                                    ...prev,
                                    actualEffort: Number(e.target.value),
                                  }) : prev)}
                                  className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                />
                              ) : (
                                <>{actualValue}h</>
                              )}
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
                          sf.type === 'Screen' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
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
          onClose={(saved) => {
            setEditingSSF(null);
            if (saved) {
              queryClient.invalidateQueries({ queryKey: ['stageDetail', parseInt(stageId)] });
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
    </div>
  );
}
