import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, addDays } from 'date-fns';
import { Gantt, Willow } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/style.css';
import type { Phase } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { phaseApi } from '@/services/api';
import type { ITask, IScaleConfig } from '@svar-ui/react-gantt';

interface PhaseChange {
  phaseId: number;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}

interface PhaseTimelineSvarGanttProps {
  phases: Phase[];
  projectId?: number;
}

type TimelineView = 'Day' | 'Week' | 'Month' | 'Year';
type ViewMode = 'estimate' | 'actual';
type PhaseStatus = 'Good' | 'Warning' | 'At Risk';

// LocalStorage key for persisting time scale
const TIME_SCALE_STORAGE_KEY = 'gantt-timeline-time-scale';

const getStoredTimeScale = (): TimelineView => {
  if (typeof window === 'undefined') return 'Week';
  const stored = localStorage.getItem(TIME_SCALE_STORAGE_KEY);
  if (stored && ['Day', 'Week', 'Month', 'Year'].includes(stored)) {
    return stored as TimelineView;
  }
  return 'Week';
};

export const PhaseTimelineSvarGantt = ({ phases, projectId }: PhaseTimelineSvarGanttProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<TimelineView>(getStoredTimeScale);
  const [viewMode, setViewMode] = useState<ViewMode>('estimate');

  // Persist time scale to localStorage
  const handleViewChange = useCallback((newView: TimelineView) => {
    setView(newView);
    localStorage.setItem(TIME_SCALE_STORAGE_KEY, newView);
  }, []);
  const [selectedStatuses, setSelectedStatuses] = useState<PhaseStatus[]>([
    'Good',
    'Warning',
    'At Risk',
  ]);
  const [pendingChanges, setPendingChanges] = useState<Map<number, PhaseChange>>(new Map());

  const updatePhaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Phase> }) => phaseApi.update(id, data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['phases', projectId] });
      }
      setPendingChanges(new Map());
    },
  });

  const handleSaveChanges = useCallback(() => {
    pendingChanges.forEach((change) => {
      const updateData: Partial<Phase> = {};
      if (change.startDate) updateData.startDate = change.startDate;
      if (change.endDate) updateData.endDate = change.endDate;
      if (change.actualStartDate) updateData.actualStartDate = change.actualStartDate;
      if (change.actualEndDate) updateData.actualEndDate = change.actualEndDate;

      updatePhaseMutation.mutate({ id: change.phaseId, data: updateData });
    });
  }, [pendingChanges, updatePhaseMutation]);

  const handleUndoChanges = useCallback(() => {
    setPendingChanges(new Map());
    // Trigger re-render to reset gantt with original data
    queryClient.invalidateQueries({ queryKey: ['phases', projectId] });
  }, [projectId, queryClient]);

  const statusOptions: { value: PhaseStatus; label: string; color: string; bgColor: string }[] = useMemo(
    () => [
      { value: 'Good', label: t('project.statusGood'), color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
      { value: 'Warning', label: t('project.statusWarning'), color: 'text-amber-700', bgColor: 'bg-amber-100' },
      { value: 'At Risk', label: t('project.statusAtRisk'), color: 'text-red-700', bgColor: 'bg-red-100' },
    ],
    [t],
  );

  // Filter phases based on view mode and status
  const filteredPhases = useMemo(() => {
    return phases.filter((phase) => {
      if (!selectedStatuses.includes(phase.status as PhaseStatus)) {
        return false;
      }

      if (viewMode === 'estimate') {
        return phase.startDate && phase.endDate;
      } else {
        return phase.actualStartDate && phase.actualEndDate;
      }
    });
  }, [phases, selectedStatuses, viewMode]);

  // Transform phases to Svar Gantt tasks
  const tasks: ITask[] = useMemo(() => {
    if (filteredPhases.length === 0) return [];

    const sorted = [...filteredPhases].sort((a, b) => a.displayOrder - b.displayOrder);

    return sorted.map((phase) => {
      let start: Date;
      let end: Date;

      if (viewMode === 'estimate') {
        start = parseISO(phase.startDate);
        end = phase.endDate ? parseISO(phase.endDate) : addDays(start, 1);
      } else {
        start = phase.actualStartDate ? parseISO(phase.actualStartDate) : new Date();
        end = phase.actualEndDate ? parseISO(phase.actualEndDate) : addDays(start, 1);
      }

      return {
        id: phase.id,
        text: phase.name,
        start,
        end,
        progress: phase.progress / 100, // Svar uses 0-1 range
        type: 'task',
        details: `Status: ${phase.status}`,
        // Custom data for color coding
        $status: phase.status,
      };
    });
  }, [filteredPhases, viewMode]);

  // Configure scales based on view
  // Using function callbacks for date formatting to ensure proper display
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
            }
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
    if (!filteredPhases.length) return null;

    const total = filteredPhases.length;
    const completed = filteredPhases.filter((p) => p.progress >= 100).length;
    const inProgress = filteredPhases.filter((p) => p.progress > 0 && p.progress < 100).length;
    const notStarted = filteredPhases.filter((p) => p.progress === 0).length;
    const avgProgress = filteredPhases.reduce((sum, p) => sum + p.progress, 0) / total;

    return { total, completed, inProgress, notStarted, avgProgress };
  }, [filteredPhases]);

  const toggleStatus = useCallback((status: PhaseStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  }, []);

  // Handle task update event
  const handleUpdateTask = useCallback((ev: any) => {
    const taskUpdate = ev.task;
    const phaseId = ev.id as number;

    if (!taskUpdate.start || !taskUpdate.end) return;

    const change: PhaseChange = { phaseId };

    if (viewMode === 'estimate') {
      change.startDate = format(taskUpdate.start, 'yyyy-MM-dd');
      change.endDate = format(taskUpdate.end, 'yyyy-MM-dd');
    } else {
      change.actualStartDate = format(taskUpdate.start, 'yyyy-MM-dd');
      change.actualEndDate = format(taskUpdate.end, 'yyyy-MM-dd');
    }

    setPendingChanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(phaseId, change);
      return newMap;
    });
  }, [viewMode]);

  // Custom task template for color coding
  const highlightTime = useCallback(() => {
    // Weekend highlighting removed per user request
    return '';
  }, []);

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('phase.timeline.empty')}
      </div>
    );
  }

  return (
    <div className="gantt-svar-container rounded-lg border border-gray-200 bg-white">
      {/* Horizontal Controls Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200">
        {/* Title & Actions Row */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-indigo-200">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-indigo-800">Timeline Svar</h3>
              <p className="text-xs text-indigo-500">Professional Gantt Chart</p>
            </div>
            {tasks.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-semibold text-indigo-700">
                  {filteredPhases.length} phases • {viewMode === 'estimate' ? 'Estimate' : 'Actual'}
                </span>
              </div>
            )}
          </div>

          {/* Save/Undo buttons */}
          <div className="flex items-center gap-2">
            {pendingChanges.size > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg border border-amber-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {pendingChanges.size} unsaved
                </div>
                <button
                  onClick={handleUndoChanges}
                  disabled={updatePhaseMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={updatePhaseMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {updatePhaseMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Controls Row */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-6">
          {/* View Mode */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-indigo-700 uppercase">View Mode:</label>
            <div className="flex gap-2">
              {(['estimate', 'actual'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === mode
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  {mode === 'estimate' ? '📊 Estimate' : '✅ Actual'}
                </button>
              ))}
            </div>
          </div>

          {/* Time Scale */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-indigo-700 uppercase">Time Scale:</label>
            <div className="flex gap-2">
              {(['Day', 'Week', 'Month', 'Year'] as TimelineView[]).map((option) => (
                <button
                  key={option}
                  onClick={() => handleViewChange(option)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    view === option
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-indigo-700 uppercase">Status:</label>
            <div className="flex gap-2">
              {statusOptions.map((status) => {
                const selected = selectedStatuses.includes(status.value);
                return (
                  <button
                    key={status.value}
                    onClick={() => toggleStatus(status.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selected
                        ? `${status.bgColor} ${status.color} border-2 border-current`
                        : 'bg-white text-gray-400 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${selected ? 'bg-current' : 'bg-gray-300'}`} />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="ml-auto flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-600">Total:</span>
                <span className="text-xs font-bold text-indigo-800">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600">✓</span>
                <span className="text-xs font-bold text-emerald-600">{stats.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600">◐</span>
                <span className="text-xs font-bold text-amber-600">{stats.inProgress}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">○</span>
                <span className="text-xs font-bold text-gray-600">{stats.notStarted}</span>
              </div>
              <div className="flex items-center gap-2 pl-3 border-l border-indigo-200">
                <span className="text-xs text-indigo-600">Avg:</span>
                <span className="text-xs font-bold text-indigo-700">{stats.avgProgress.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-indigo-50 py-20">
          <div className="text-center max-w-md px-6">
            <svg className="mx-auto h-16 w-16 text-indigo-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-semibold text-indigo-700 mb-2">No phases to display</h3>
            <p className="text-sm text-indigo-500">
              {viewMode === 'estimate'
                ? 'Add phases with start and end dates to see them on the timeline'
                : 'No phases with actual dates found. Switch to Estimate mode or add actual dates to phases'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-auto pb-16" style={{ minHeight: '300px' }}>
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
          {/* Extra space at bottom for last phase visibility */}
          <div className="h-16" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
