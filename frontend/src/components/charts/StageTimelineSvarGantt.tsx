import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, addDays } from 'date-fns';
import { Gantt, Willow } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/style.css';
import type { StageOverviewData, WorkflowStage } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskWorkflowApi } from '@/services/api';
import type { ITask, IScaleConfig } from '@svar-ui/react-gantt';

interface StageChange {
  stageId: number;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}

interface StageTimelineSvarGanttProps {
  stages: StageOverviewData[];
  projectId?: number;
}

type TimelineView = 'Day' | 'Week' | 'Month' | 'Year';
type ViewMode = 'estimate' | 'actual';
type StageStatus = 'Good' | 'Warning' | 'At Risk';

const TIME_SCALE_STORAGE_KEY = 'stage-gantt-timeline-time-scale';

const getStoredTimeScale = (): TimelineView => {
  if (typeof window === 'undefined') return 'Week';
  const stored = localStorage.getItem(TIME_SCALE_STORAGE_KEY);
  if (stored && ['Day', 'Week', 'Month', 'Year'].includes(stored)) {
    return stored as TimelineView;
  }
  return 'Week';
};

export const StageTimelineSvarGantt = ({ stages, projectId }: StageTimelineSvarGanttProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<TimelineView>(getStoredTimeScale);
  const [viewMode, setViewMode] = useState<ViewMode>('estimate');

  const handleViewChange = useCallback((newView: TimelineView) => {
    setView(newView);
    localStorage.setItem(TIME_SCALE_STORAGE_KEY, newView);
  }, []);
  const [selectedStatuses, setSelectedStatuses] = useState<StageStatus[]>([
    'Good',
    'Warning',
    'At Risk',
  ]);
  const [pendingChanges, setPendingChanges] = useState<Map<number, StageChange>>(new Map());

  const updateStageMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WorkflowStage> }) => taskWorkflowApi.updateStage(id, data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['stagesOverview', projectId] });
      }
      setPendingChanges(new Map());
    },
  });

  const handleSaveChanges = useCallback(() => {
    pendingChanges.forEach((change) => {
      const updateData: Partial<WorkflowStage> = {};
      if (change.startDate) updateData.startDate = change.startDate;
      if (change.endDate) updateData.endDate = change.endDate;
      if (change.actualStartDate) updateData.actualStartDate = change.actualStartDate;
      if (change.actualEndDate) updateData.actualEndDate = change.actualEndDate;

      updateStageMutation.mutate({ id: change.stageId, data: updateData });
    });
  }, [pendingChanges, updateStageMutation]);

  const handleUndoChanges = useCallback(() => {
    setPendingChanges(new Map());
    queryClient.invalidateQueries({ queryKey: ['stagesOverview', projectId] });
  }, [projectId, queryClient]);

  const statusOptions: { value: StageStatus; label: string; color: string; bgColor: string }[] = useMemo(
    () => [
      { value: 'Good', label: t('project.statusGood'), color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
      { value: 'Warning', label: t('project.statusWarning'), color: 'text-amber-700', bgColor: 'bg-amber-100' },
      { value: 'At Risk', label: t('project.statusAtRisk'), color: 'text-red-700', bgColor: 'bg-red-100' },
    ],
    [t],
  );

  const filteredStages = useMemo(() => {
    return stages.filter((stage) => {
      if (!selectedStatuses.includes(stage.status as StageStatus)) {
        return false;
      }

      if (viewMode === 'estimate') {
        return stage.startDate && stage.endDate;
      } else {
        return stage.actualStartDate && stage.actualEndDate;
      }
    });
  }, [stages, selectedStatuses, viewMode]);

  const tasks: ITask[] = useMemo(() => {
    if (filteredStages.length === 0) return [];

    const sorted = [...filteredStages].sort((a, b) => a.displayOrder - b.displayOrder);

    return sorted.map((stage) => {
      let start: Date;
      let end: Date;

      if (viewMode === 'estimate') {
        start = stage.startDate ? parseISO(stage.startDate) : new Date();
        end = stage.endDate ? parseISO(stage.endDate) : addDays(start, 1);
      } else {
        start = stage.actualStartDate ? parseISO(stage.actualStartDate) : new Date();
        end = stage.actualEndDate ? parseISO(stage.actualEndDate) : addDays(start, 1);
      }

      return {
        id: stage.id,
        text: stage.name,
        start,
        end,
        progress: (stage.progress ?? 0) / 100,
        type: 'task',
        details: `Status: ${stage.status}`,
        $status: stage.status,
      };
    });
  }, [filteredStages, viewMode]);

  const scales: IScaleConfig[] = useMemo(() => {
    switch (view) {
      case 'Day':
        return [
          { unit: 'month', step: 1, format: (date: Date) => format(date, 'MMMM yyyy') },
          { unit: 'day', step: 1, format: (date: Date) => format(date, 'd MMM') },
        ];
      case 'Week':
        return [
          { unit: 'month', step: 1, format: (date: Date) => format(date, 'MMMM yyyy') },
          { unit: 'week', step: 1, format: (date: Date) => `Week ${Math.ceil(date.getDate() / 7)}` },
        ];
      case 'Month':
        return [
          { unit: 'year', step: 1, format: (date: Date) => format(date, 'yyyy') },
          { unit: 'month', step: 1, format: (date: Date) => format(date, 'MMM yyyy') },
        ];
      case 'Year':
        return [
          { unit: 'year', step: 1, format: (date: Date) => format(date, 'yyyy') },
          {
            unit: 'quarter',
            step: 1,
            format: (date: Date) => {
              const quarter = Math.floor(date.getMonth() / 3) + 1;
              return `Q${quarter} ${date.getFullYear()}`;
            },
          },
        ];
      default:
        return [
          { unit: 'month', step: 1, format: (date: Date) => format(date, 'MMMM yyyy') },
          { unit: 'week', step: 1, format: (date: Date) => `Week ${Math.ceil(date.getDate() / 7)}` },
        ];
    }
  }, [view]);

  const stats = useMemo(() => {
    if (!filteredStages.length) return null;

    const total = filteredStages.length;
    const completed = filteredStages.filter((s) => (s.progress ?? 0) >= 100).length;
    const inProgress = filteredStages.filter((s) => (s.progress ?? 0) > 0 && (s.progress ?? 0) < 100).length;
    const notStarted = filteredStages.filter((s) => (s.progress ?? 0) === 0).length;
    const avgProgress = filteredStages.reduce((sum, s) => sum + (s.progress ?? 0), 0) / total;

    return { total, completed, inProgress, notStarted, avgProgress };
  }, [filteredStages]);

  const toggleStatus = useCallback((status: StageStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  }, []);

  const handleUpdateTask = useCallback((ev: any) => {
    const taskUpdate = ev.task;
    const stageId = ev.id as number;

    if (!taskUpdate.start || !taskUpdate.end) return;

    const change: StageChange = { stageId };

    if (viewMode === 'estimate') {
      change.startDate = format(taskUpdate.start, 'yyyy-MM-dd');
      change.endDate = format(taskUpdate.end, 'yyyy-MM-dd');
    } else {
      change.actualStartDate = format(taskUpdate.start, 'yyyy-MM-dd');
      change.actualEndDate = format(taskUpdate.end, 'yyyy-MM-dd');
    }

    setPendingChanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(stageId, change);
      return newMap;
    });
  }, [viewMode]);

  const highlightTime = useCallback(() => {
    return '';
  }, []);

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('stages.timeline.empty')}
      </div>
    );
  }

  return (
    <div className="gantt-svar-container rounded-lg border border-gray-200 bg-white">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200">
        <div className="flex flex-wrap items-center gap-3 p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">{t('stages.timeline.viewLabel')}</span>
            <select
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              value={view}
              onChange={(e) => handleViewChange(e.target.value as TimelineView)}
            >
              <option value="Day">{t('stages.timeline.view.day')}</option>
              <option value="Week">{t('stages.timeline.view.week')}</option>
              <option value="Month">{t('stages.timeline.view.month')}</option>
              <option value="Year">{t('stages.timeline.view.year')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">{t('stages.timeline.mode')}</span>
            <div className="flex rounded-md border border-gray-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('estimate')}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  viewMode === 'estimate'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t('stages.timeline.estimate')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('actual')}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  viewMode === 'actual'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t('stages.timeline.actual')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-700">{t('stages.timeline.statusFilter')}</span>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleStatus(option.value)}
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  selectedStatuses.includes(option.value)
                    ? `${option.bgColor} ${option.color}`
                    : 'bg-white text-gray-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {pendingChanges.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600"
                onClick={handleUndoChanges}
                disabled={updateStageMutation.isPending}
              >
                {t('common.undo')}
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white"
                onClick={handleSaveChanges}
                disabled={updateStageMutation.isPending}
              >
                {updateStageMutation.isPending ? t('common.saving') : t('common.save')}
              </button>
            </div>
          )}
        </div>

        {stats && (
          <div className="flex flex-wrap items-center gap-6 border-t border-indigo-200 px-3 py-2 text-xs text-gray-600">
            <span>{t('stages.timeline.summary', { total: stats.total })}</span>
            <span>{t('stages.timeline.completed', { count: stats.completed })}</span>
            <span>{t('stages.timeline.inProgress', { count: stats.inProgress })}</span>
            <span>{t('stages.timeline.notStarted', { count: stats.notStarted })}</span>
            <span>{t('stages.timeline.avgProgress', { progress: stats.avgProgress.toFixed(1) })}</span>
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-indigo-50 py-20">
          <div className="text-center max-w-md px-6">
            <svg className="mx-auto h-16 w-16 text-indigo-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-semibold text-indigo-700 mb-2">{t('stages.timeline.empty')}</h3>
            <p className="text-sm text-indigo-500">
              {viewMode === 'estimate'
                ? t('stages.timeline.noEstimateDates')
                : t('stages.timeline.noActualDates')}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <Willow>
            <Gantt
              tasks={tasks}
              scales={scales}
              cellHeight={40}
              cellWidth={100}
              highlightTime={highlightTime}
              readonly={false}
              columns={[] as any}
              onupdatetask={handleUpdateTask}
            />
          </Willow>
        </div>
      )}
    </div>
  );
};
