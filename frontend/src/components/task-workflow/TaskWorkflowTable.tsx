import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Card, LoadingSpinner, Button, Input, EmptyState, ProgressBar } from '@/components/common';
import type { Member } from '@/types';

interface TaskWorkflowTableProps {
  projectId: number;
  members?: Member[];
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

  // Toggle task workflow mutation
  const toggleMutation = useMutation({
    mutationFn: (data: { screenFunctionId: number; stepId: number; isCompleted: boolean }) =>
      taskWorkflowApi.toggleTaskWorkflow(data),
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

  // Handle checkbox toggle
  const handleToggle = (screenFunctionId: number, stepId: number, currentState: boolean) => {
    toggleMutation.mutate({
      screenFunctionId,
      stepId,
      isCompleted: !currentState,
    });
  };

  // Check if a step is completed for a screen function
  const isStepCompleted = (screenFunctionId: number, stepId: number): boolean => {
    if (!workflowData?.taskWorkflows) return false;
    const tw = workflowData.taskWorkflows.find(
      (t) => t.screenFunctionId === screenFunctionId && t.stepId === stepId
    );
    return tw?.isCompleted || false;
  };

  // Calculate release percentage for a screen function
  const calculateReleasePercentage = (screenFunctionId: number): number => {
    if (!workflowData) return 0;
    const allSteps = workflowData.stages.flatMap((s) => s.steps || []);
    if (allSteps.length === 0) return 0;

    const completedCount = allSteps.filter((step) =>
      isStepCompleted(screenFunctionId, step.id)
    ).length;

    return Math.round((completedCount / allSteps.length) * 100);
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
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={stageFilter || ''}
              onChange={(e) => setStageFilter(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">{t('taskWorkflow.allStages')}</option>
              {workflowData.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'incomplete')}
            >
              <option value="all">{t('taskWorkflow.allStatus')}</option>
              <option value="completed">{t('taskWorkflow.completed')}</option>
              <option value="incomplete">{t('taskWorkflow.incomplete')}</option>
            </select>
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
                        const completed = isStepCompleted(sf.id, step.id);
                        return (
                          <td
                            key={`${sf.id}-${step.id}`}
                            className="px-1 py-2 text-center"
                          >
                            <input
                              type="checkbox"
                              checked={completed}
                              onChange={() => handleToggle(sf.id, step.id, completed)}
                              disabled={toggleMutation.isPending}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                            />
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
