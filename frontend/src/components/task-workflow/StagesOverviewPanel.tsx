import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi, screenFunctionApi } from '@/services/api';
import { Card, LoadingSpinner, Button, Modal, EmptyState, ProgressBar } from '@/components/common';
import { StageEditModal } from './StageEditModal';
import type { StageOverviewData, StageStatus, EffortUnit, ProjectSettings, ScreenFunctionType } from '@/types';
import { convertEffort, formatEffort, EFFORT_UNIT_LABELS } from '@/utils/effortUtils';

interface StagesOverviewPanelProps {
  projectId: number;
  effortUnit?: EffortUnit;
  workSettings?: Partial<ProjectSettings>;
}

export function StagesOverviewPanel({
  projectId,
  effortUnit = 'man-hour',
  workSettings,
}: StagesOverviewPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState<StageOverviewData | null>(null);
  const [quickLinkStageId, setQuickLinkStageId] = useState<number | null>(null);
  const [quickLinkType, setQuickLinkType] = useState<ScreenFunctionType>('Screen');
  const [quickLinkResult, setQuickLinkResult] = useState<{
    created: number;
    skipped: number;
    details: Array<{ stepId: number; stepName: string; linked: number }>;
  } | null>(null);

  // Fetch stages overview
  const { data: stages, isLoading, refetch } = useQuery({
    queryKey: ['stagesOverview', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStagesOverview(projectId);
      return response.data;
    },
  });

  // Fetch screen function summary for quick link counts
  const { data: sfSummary } = useQuery({
    queryKey: ['screenFunctionSummary', projectId],
    queryFn: async () => {
      const response = await screenFunctionApi.getSummary(projectId);
      return response.data;
    },
    enabled: quickLinkStageId !== null,
  });

  // Quick link mutation
  const quickLinkMutation = useMutation({
    mutationFn: (data: { stageId: number; type: string }) =>
      taskWorkflowApi.quickLinkByType(data.stageId, data.type),
    onSuccess: (response) => {
      setQuickLinkResult(response.data);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['screenFunctionSummary'] });
    },
  });

  const handleQuickLink = () => {
    if (!quickLinkStageId) return;
    quickLinkMutation.mutate({
      stageId: quickLinkStageId,
      type: quickLinkType,
    });
  };

  const openQuickLink = (stageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickLinkStageId(stageId);
    setQuickLinkType('Screen');
    setQuickLinkResult(null);
  };

  const closeQuickLink = () => {
    setQuickLinkStageId(null);
    setQuickLinkResult(null);
  };

  // Handle stage click to navigate to stage detail
  const handleStageClick = (stageId: number) => {
    window.location.href = `/projects/${projectId}/stages/${stageId}`;
  };

  // Handle edit modal close
  const handleEditClose = (saved?: boolean) => {
    setEditingStage(null);
    if (saved) {
      refetch();
    }
  };

  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Format effort with unit conversion
  const displayEffort = (hours: number): string => {
    const converted = convertEffort(hours, 'man-hour', effortUnit, workSettings);
    return formatEffort(converted, effortUnit);
  };

  // Get status color class
  const getStatusColor = (status: StageStatus): string => {
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

  // Get unit label
  const unitLabel = EFFORT_UNIT_LABELS[effortUnit];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stages || stages.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t('stages.noStages')}
          description={t('stages.initializeWorkflowFirst')}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('stages.title')}</h2>
        <Button variant="secondary" onClick={() => refetch()}>
          {t('common.refresh')}
        </Button>
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <Card key={stage.id} className="hover:shadow-lg transition-shadow">
            {/* Stage Header */}
            <div className="flex justify-between items-start mb-3">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleStageClick(stage.id)}
              >
                <h3 className="text-lg font-medium text-gray-900 hover:text-primary-600">
                  {stage.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(stage.status)}`}>
                    {stage.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {stage.stepsCount} {t('stages.steps')} | {stage.linkedScreensCount} {t('stages.linkedScreens')}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => openQuickLink(stage.id, e)}
                  title={t('stages.quickLink', { defaultValue: 'Quick Link' })}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingStage(stage);
                  }}
                >
                  {t('common.edit')}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">{t('stages.progress')}</span>
                <span className="font-medium">{stage.progress}%</span>
              </div>
              <ProgressBar progress={stage.progress} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <span className="text-gray-500">{t('stages.startDate')}:</span>
                <span className="ml-1">{formatDate(stage.startDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('stages.endDate')}:</span>
                <span className="ml-1">{formatDate(stage.endDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('stages.actualStart')}:</span>
                <span className="ml-1">{formatDate(stage.actualStartDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('stages.actualEnd')}:</span>
                <span className="ml-1">{formatDate(stage.actualEndDate)}</span>
              </div>
            </div>

            {/* Effort */}
            <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
              <div>
                <span className="text-gray-500">{t('stages.estimatedEffort')}:</span>
                <span className="ml-1 font-medium">
                  {displayEffort(stage.estimatedEffort || 0)} {unitLabel}
                </span>
              </div>
              <div>
                <span className="text-gray-500">{t('stages.actualEffort')}:</span>
                <span className="ml-1 font-medium">
                  {displayEffort(stage.actualEffort || 0)} {unitLabel}
                </span>
              </div>
            </div>

            {/* View Details Link */}
            <div className="mt-3 pt-3 border-t">
              <button
                onClick={() => handleStageClick(stage.id)}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                {t('stages.viewDetails')} &rarr;
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {editingStage && (
        <StageEditModal
          stage={editingStage}
          projectId={projectId}
          effortUnit={effortUnit}
          workSettings={workSettings}
          onClose={handleEditClose}
        />
      )}

      {/* Quick Link Modal */}
      <Modal
        isOpen={quickLinkStageId !== null}
        onClose={closeQuickLink}
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

              {/* Stage name context */}
              {quickLinkStageId && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500">{t('stages.stage', { defaultValue: 'Stage' })}:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {stages?.find(s => s.id === quickLinkStageId)?.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({stages?.find(s => s.id === quickLinkStageId)?.stepsCount} {t('stages.steps')})
                  </span>
                </div>
              )}

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

              {quickLinkStageId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">
                    {t('stages.quickLinkPreview', { defaultValue: 'Preview' })}
                  </p>
                  <p className="text-sm text-gray-700">
                    {sfSummary?.byType?.[quickLinkType] ?? 0} {quickLinkType}(s) &times; {stages?.find(s => s.id === quickLinkStageId)?.stepsCount ?? 0} step(s) = {t('stages.upTo', { defaultValue: 'up to' })} <strong>{(sfSummary?.byType?.[quickLinkType] ?? 0) * (stages?.find(s => s.id === quickLinkStageId)?.stepsCount ?? 0)}</strong> {t('stages.tasks', { defaultValue: 'tasks' })}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={closeQuickLink}>
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
                        <span className={d.linked > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          +{d.linked}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={closeQuickLink}>
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
