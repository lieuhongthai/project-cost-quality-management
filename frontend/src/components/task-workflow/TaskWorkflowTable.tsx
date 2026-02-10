import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Card, LoadingSpinner, Button, Input, EmptyState, ProgressBar, Select } from '@/components/common';
import type { Member, StepScreenFunctionStatus } from '@/types';

interface TaskWorkflowTableProps {
  projectId: number;
  members?: Member[];
}

// Type for step screen function from API
interface StepScreenFunctionItem {
  id: number;
  stepId: number;
  screenFunctionId: number;
  status: StepScreenFunctionStatus;
}

export function TaskWorkflowTable({ projectId }: TaskWorkflowTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Filter state
  const [screenFilter, setScreenFilter] = useState('');
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

  // Fetch workflow data
  const { data: workflowData, isLoading, refetch } = useQuery({
    queryKey: ['taskWorkflow', projectId, screenFilter, stageFilter, statusFilter],
    queryFn: async () => {
      const response = await taskWorkflowApi.getProjectWorkflow(projectId, {
        screenName: screenFilter || undefined,
        stageId: stageFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      return response.data;
    },
  });

  // Initialize workflow mutation
  const initializeMutation = useMutation({
    mutationFn: () => taskWorkflowApi.initializeWorkflow(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskWorkflow', projectId] });
    },
  });

  // Export to Excel
  const handleExport = async () => {
    try {
      const response = await taskWorkflowApi.exportExcel(projectId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `task-workflow-${projectId}-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Get StepScreenFunction status for a screen function and step
  // Returns: 'Completed' | 'In Progress' | 'Not Started' | 'Skipped' | null (not linked)
  const getStepScreenFunctionStatus = (
    screenFunctionId: number,
    stepId: number
  ): StepScreenFunctionStatus | null => {
    if (!workflowData?.stepScreenFunctions) return null;
    const ssf = workflowData.stepScreenFunctions.find(
      (s: StepScreenFunctionItem) =>
        s.screenFunctionId === screenFunctionId && s.stepId === stepId
    );
    return ssf ? ssf.status : null;
  };

  // Calculate release percentage for a screen function based on StepScreenFunction status
  const calculateReleasePercentage = (screenFunctionId: number): number => {
    if (!workflowData?.stepScreenFunctions) return 0;

    // Get steps that have a StepScreenFunction link for this screenFunction
    const linkedSteps = workflowData.stepScreenFunctions.filter(
      (s: StepScreenFunctionItem) => s.screenFunctionId === screenFunctionId
    );
    if (linkedSteps.length === 0) return 0;

    const completedCount = linkedSteps.filter(
      (s: StepScreenFunctionItem) => s.status === 'Completed'
    ).length;

    return Math.round((completedCount / linkedSteps.length) * 100);
  };

  // All steps flattened
  const allSteps = useMemo(() => {
    if (!workflowData?.stages) return [];
    return workflowData.stages.flatMap((stage) =>
      (stage.steps || []).map((step) => ({
        ...step,
        stageName: stage.name,
        stageColor: stage.color,
      }))
    );
  }, [workflowData?.stages]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show initialize button if no stages exist
  if (!workflowData?.stages || workflowData.stages.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t('taskWorkflow.noWorkflow')}
          description={t('taskWorkflow.initializeDescription')}
        />
        <div className="mt-4 text-center">
          <Button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            {initializeMutation.isPending
              ? t('common.loading')
              : t('taskWorkflow.initialize')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{t('taskWorkflow.progress')}</h3>
            <p className="text-sm text-gray-500">
              {workflowData.progress.completed} / {workflowData.progress.total} {t('taskWorkflow.stepsCompleted')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary-600">
              {workflowData.progress.percentage}%
            </span>
          </div>
        </div>
        <ProgressBar progress={workflowData.progress.percentage} />
      </Card>

      {/* Filters and Actions */}
      <Card>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Screen Filter */}
            <div className="w-64">
              <Input
                placeholder={t('taskWorkflow.filterByScreen')}
                value={screenFilter}
                onChange={(e) => setScreenFilter(e.target.value)}
              />
            </div>

            {/* Stage Filter */}
            <Select
              value={stageFilter || ''}
              onChange={(e) => setStageFilter(e.target.value ? parseInt(e.target.value as string) : null)}
              options={[
                { value: '', label: t('taskWorkflow.allStages') },
                ...workflowData.stages.map((stage) => ({
                  value: stage.id,
                  label: stage.name,
                })),
              ]}
              fullWidth={false}
            />

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'incomplete')}
              options={[
                { value: 'all', label: t('taskWorkflow.allStatus') },
                { value: 'completed', label: t('taskWorkflow.completed') },
                { value: 'incomplete', label: t('taskWorkflow.incomplete') },
              ]}
              fullWidth={false}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refetch()}>
              {t('common.refresh')}
            </Button>
            <Button onClick={handleExport}>
              {t('taskWorkflow.exportExcel')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Workflow Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              {/* Stage Header Row */}
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-20 bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  No
                </th>
                <th className="sticky left-12 z-20 bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Screen
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Note
                </th>
                {workflowData.stages.map((stage) => (
                  <th
                    key={stage.id}
                    colSpan={(stage.steps || []).length}
                    className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-200"
                    style={{ backgroundColor: stage.color || undefined }}
                  >
                    {stage.name}
                    <span className="ml-1 text-gray-500">({(stage.steps || []).length})</span>
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Release
                </th>
              </tr>

              {/* Step Header Row */}
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2"></th>
                <th className="sticky left-12 z-20 bg-gray-50 px-3 py-2"></th>
                <th className="px-3 py-2"></th>
                {allSteps.map((step) => (
                  <th
                    key={step.id}
                    className="px-1 py-2 text-center text-xs font-medium text-gray-600 tracking-wider whitespace-nowrap"
                    title={`${step.stageName} - ${step.name}`}
                  >
                    {step.name}
                  </th>
                ))}
                <th className="px-3 py-2"></th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {workflowData.screenFunctions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + allSteps.length}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {t('taskWorkflow.noScreenFunctions')}
                  </td>
                </tr>
              ) : (
                workflowData.screenFunctions.map((sf, index) => {
                  const releasePercentage = calculateReleasePercentage(sf.id);
                  return (
                    <tr key={sf.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="sticky left-12 z-10 bg-white px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">{sf.name}</div>
                        <div className="text-xs text-gray-500">{sf.type}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 max-w-[150px] truncate" title={sf.description}>
                        {sf.description || '-'}
                      </td>
                      {allSteps.map((step) => {
                        const status = getStepScreenFunctionStatus(sf.id, step.id);
                        return (
                          <td
                            key={`${sf.id}-${step.id}`}
                            className="px-1 py-2 text-center"
                            title={status ? t(`screenFunction.status${status.replace(' ', '')}`) : t('taskWorkflow.notLinked')}
                          >
                            {status === null ? (
                              // Not linked - show dash
                              <span className="text-gray-400">-</span>
                            ) : status === 'Completed' ? (
                              // Completed - show checkmark
                              <span className="text-green-600">✓</span>
                            ) : status === 'Skipped' ? (
                              // Skipped - show skip symbol
                              <span className="text-gray-400">○</span>
                            ) : (
                              // Not Started or In Progress - show empty box
                              <span className="text-gray-400">☐</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            releasePercentage === 100
                              ? 'bg-green-100 text-green-800'
                              : releasePercentage >= 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {releasePercentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
