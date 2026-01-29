import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { taskWorkflowApi } from '@/services/api';
import { Card, LoadingSpinner, Button, EmptyState, ProgressBar } from '@/components/common';
import { StageEditModal } from './StageEditModal';
import type { StageOverviewData, StageStatus } from '@/types';

interface StagesOverviewPanelProps {
  projectId: number;
}

export function StagesOverviewPanel({ projectId }: StagesOverviewPanelProps) {
  const { t } = useTranslation();
  const [editingStage, setEditingStage] = useState<StageOverviewData | null>(null);

  // Fetch stages overview
  const { data: stages, isLoading, refetch } = useQuery({
    queryKey: ['stagesOverview', projectId],
    queryFn: async () => {
      const response = await taskWorkflowApi.getStagesOverview(projectId);
      return response.data;
    },
  });

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
                <span className="ml-1 font-medium">{stage.estimatedEffort || 0}h</span>
              </div>
              <div>
                <span className="text-gray-500">{t('stages.actualEffort')}:</span>
                <span className="ml-1 font-medium">{stage.actualEffort || 0}h</span>
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
          onClose={handleEditClose}
        />
      )}
    </div>
  );
}
