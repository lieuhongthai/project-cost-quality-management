import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format, parseISO } from 'date-fns';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import type { Phase } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { phaseApi } from '@/services/api';

// Enhanced CSS for V2 with modern styling
const ganttStyleV2 = `
<style>
  .gantt-v2-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .gantt .bar {
    cursor: move;
    transition: opacity 0.2s;
  }

  .gantt .bar-wrapper:hover .bar {
    opacity: 0.85;
    filter: brightness(1.1);
  }

  .gantt .bar-progress {
    fill: #4f46e5 !important;
    opacity: 0.8;
  }

  .gantt .bar-label {
    font-size: 12px;
    font-weight: 600;
    fill: #ffffff;
  }

  /* Status-based colors with modern palette */
  .gantt-status-good .bar {
    fill: #10b981 !important;
  }

  .gantt-status-warning .bar {
    fill: #f59e0b !important;
  }

  .gantt-status-at-risk .bar {
    fill: #ef4444 !important;
  }

  /* Grid styling */
  .gantt .grid-row:nth-child(even) {
    fill: #ffffff;
  }

  .gantt .grid-row:nth-child(odd) {
    fill: #f9fafb;
  }
</style>
`;

interface PhaseChange {
  phaseId: number;
  startDate?: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}

interface PhaseTimelineFrappeGanttV2Props {
  phases: Phase[];
  projectId?: number;
}

type TimelineView = 'Day' | 'Week' | 'Month' | 'Year';
type ViewMode = 'estimate' | 'actual';
type PhaseStatus = 'Good' | 'Warning' | 'At Risk';

type GanttTask = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  custom_class?: string;
};

export const PhaseTimelineFrappeGanttV2 = ({ phases, projectId }: PhaseTimelineFrappeGanttV2Props) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<TimelineView>('Week');
  const [viewMode, setViewMode] = useState<ViewMode>('estimate');
  const [selectedStatuses, setSelectedStatuses] = useState<PhaseStatus[]>([
    'Good',
    'Warning',
    'At Risk',
  ]);
  const [pendingChanges, setPendingChanges] = useState<Map<number, PhaseChange>>(new Map());
  const [ganttKey, setGanttKey] = useState(0); // Force re-render on undo
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ganttInstanceRef = useRef<any>(null);

  const updatePhaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Phase> }) => phaseApi.update(id, data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['phases', projectId] });
      }
      setPendingChanges(new Map());
      setGanttKey((prev) => prev + 1); // Force gantt refresh with new data
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
    setGanttKey((prev) => prev + 1); // Force gantt to recreate with original data
  }, []);

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

  const timelineData = useMemo(() => {
    if (filteredPhases.length === 0) return null;

    const sorted = [...filteredPhases].sort((a, b) => a.displayOrder - b.displayOrder);

    const tasks: GanttTask[] = sorted.map((phase) => {
      let start: string;
      let end: string;

      if (viewMode === 'estimate') {
        start = phase.startDate;
        end = phase.endDate || format(addDays(parseISO(phase.startDate), 1), 'yyyy-MM-dd');
      } else {
        start = phase.actualStartDate || format(new Date(), 'yyyy-MM-dd');
        end = phase.actualEndDate || format(addDays(parseISO(start), 1), 'yyyy-MM-dd');
      }

      const statusClass = `gantt-status-${phase.status.replace(/\s+/g, '-').toLowerCase()}`;

      return {
        id: String(phase.id),
        name: phase.name,
        start,
        end,
        progress: Math.max(0, Math.min(100, Math.round(phase.progress))),
        custom_class: statusClass,
      };
    });

    return {
      tasks,
      phases: sorted,
    };
  }, [filteredPhases, viewMode]);

  const stats = useMemo(() => {
    if (!filteredPhases.length) return null;

    const total = filteredPhases.length;
    const completed = filteredPhases.filter(p => p.progress >= 100).length;
    const inProgress = filteredPhases.filter(p => p.progress > 0 && p.progress < 100).length;
    const notStarted = filteredPhases.filter(p => p.progress === 0).length;
    const avgProgress = filteredPhases.reduce((sum, p) => sum + p.progress, 0) / total;

    return { total, completed, inProgress, notStarted, avgProgress };
  }, [filteredPhases]);

  const toggleStatus = useCallback((status: PhaseStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  }, []);

  useEffect(() => {
    if (!timelineData || !containerRef.current) return;

    containerRef.current.innerHTML = '';

    // Inject custom CSS once
    const styleId = 'gantt-custom-styles-v2';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('div');
      styleElement.id = styleId;
      styleElement.innerHTML = ganttStyleV2;
      document.head.appendChild(styleElement);
    }

    try {
      const ganttOptions: any = {
        view_mode: view,
        bar_height: 30,
        padding: 18,
        date_format: 'YYYY-MM-DD',
        language: 'en',
        on_date_change: (task: any, start: any, end: any) => {
          const phase = timelineData.phases.find((p) => String(p.id) === String(task.id));
          if (!phase) return;

          const change: PhaseChange = { phaseId: phase.id };

          const startDate = typeof start === 'string' ? parseISO(start) : start;
          const endDate = typeof end === 'string' ? parseISO(end) : end;

          if (viewMode === 'estimate') {
            change.startDate = format(startDate, 'yyyy-MM-dd');
            change.endDate = format(endDate, 'yyyy-MM-dd');
          } else {
            change.actualStartDate = format(startDate, 'yyyy-MM-dd');
            change.actualEndDate = format(endDate, 'yyyy-MM-dd');
          }

          setPendingChanges((prev) => {
            const newMap = new Map(prev);
            newMap.set(phase.id, change);
            return newMap;
          });
        },
      };

      // @ts-ignore - Frappe Gantt types are incomplete
      const gantt = new Gantt(containerRef.current, timelineData.tasks, ganttOptions);

      // @ts-ignore
      gantt.change_view_mode(view);
      ganttInstanceRef.current = gantt;
    } catch (error) {
      console.error('Failed to create Gantt chart:', error);
    }

    return () => {
      ganttInstanceRef.current = null;
    };
  }, [timelineData, view, viewMode, ganttKey]);

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('phase.timeline.empty')}
      </div>
    );
  }

  return (
    <div className={`gantt-v2-container flex gap-0 rounded-lg border border-gray-200 overflow-hidden bg-white`}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-80'
        } bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 transition-all duration-300 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h3 className="text-lg font-bold text-slate-800">Timeline V2</h3>
                <p className="text-xs text-slate-500 mt-0.5">Advanced Controls</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* View Mode Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">View Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {(['estimate', 'actual'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === mode
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {mode === 'estimate' ? '📊 Estimate' : '✅ Actual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Scale */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Time Scale</label>
              <div className="space-y-2">
                {(['Day', 'Week', 'Month', 'Year'] as TimelineView[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setView(option)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                      view === option
                        ? 'bg-indigo-100 text-indigo-700 border-l-4 border-indigo-600'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filters */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Filter by Status</label>
              <div className="space-y-2">
                {statusOptions.map((status) => {
                  const selected = selectedStatuses.includes(status.value);
                  return (
                    <button
                      key={status.value}
                      onClick={() => toggleStatus(status.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selected
                          ? `${status.bgColor} ${status.color} border-2 border-current`
                          : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${selected ? 'bg-current' : 'bg-slate-300'}`} />
                      {status.label}
                      {selected && (
                        <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Statistics</label>
                <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Total Phases</span>
                    <span className="text-sm font-bold text-slate-800">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Completed</span>
                    <span className="text-sm font-bold text-emerald-600">{stats.completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">In Progress</span>
                    <span className="text-sm font-bold text-amber-600">{stats.inProgress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Not Started</span>
                    <span className="text-sm font-bold text-slate-600">{stats.notStarted}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">Avg Progress</span>
                      <span className="text-sm font-bold text-indigo-600">{stats.avgProgress.toFixed(1)}%</span>
                    </div>
                    <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all" style={{ width: `${stats.avgProgress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {timelineData && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-semibold text-slate-700">
                  {filteredPhases.length} phases • {viewMode === 'estimate' ? 'Estimate' : 'Actual'} view
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Save/Undo buttons */}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50 border border-slate-200 transition-colors"
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

        {/* Gantt Chart */}
        {!timelineData ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center max-w-md px-6">
              <svg className="mx-auto h-16 w-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No phases to display</h3>
              <p className="text-sm text-slate-500">
                {viewMode === 'estimate'
                  ? 'Add phases with start and end dates to see them on the timeline'
                  : 'No phases with actual dates found. Switch to Estimate mode or add actual dates to phases'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-white p-4">
            <div ref={containerRef} />
          </div>
        )}
      </div>
    </div>
  );
};
