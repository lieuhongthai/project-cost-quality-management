import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format, isWeekend, parseISO } from 'date-fns';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import type { Phase } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { phaseApi } from '@/services/api';

// Custom CSS cho weekend highlighting
const weekendStyle = `
<style>
  .gantt .grid-row:nth-child(7n),
  .gantt .grid-row:nth-child(7n+1) {
    fill: #fef3c7 !important;
  }

  .gantt .bar {
    cursor: move;
  }

  .gantt .bar-wrapper:hover .bar {
    opacity: 0.9;
  }

  .gantt .bar-progress {
    fill: #3b82f6 !important;
  }

  .gantt-status-good-gantt-in-progress .bar {
    fill: #10b981 !important;
  }

  .gantt-status-good-gantt-complete .bar {
    fill: #059669 !important;
  }

  .gantt-status-warning-gantt-in-progress .bar {
    fill: #f59e0b !important;
  }

  .gantt-status-warning-gantt-complete .bar {
    fill: #d97706 !important;
  }

  .gantt-status-at-risk-gantt-in-progress .bar {
    fill: #ef4444 !important;
  }

  .gantt-status-at-risk-gantt-complete .bar {
    fill: #dc2626 !important;
  }
</style>
`;

interface PhaseTimelineFrappeGanttProps {
  phases: Phase[];
  projectId?: number;
}

type TimelineView = 'Day' | 'Week' | 'Month';
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

const toDate = (value: string) => new Date(value);

export const PhaseTimelineFrappeGantt = ({ phases, projectId }: PhaseTimelineFrappeGanttProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<TimelineView>('Week');
  const [viewMode, setViewMode] = useState<ViewMode>('estimate');
  const [selectedStatuses, setSelectedStatuses] = useState<PhaseStatus[]>([
    'Good',
    'Warning',
    'At Risk',
  ]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const ganttInstanceRef = useRef<any>(null);
  const isDispatchingWheel = useRef(false);

  const updatePhaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Phase> }) => phaseApi.update(id, data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['phases', projectId] });
      }
    },
  });

  const statusOptions: { value: PhaseStatus; label: string; color: string }[] = useMemo(
    () => [
      { value: 'Good', label: t('project.statusGood'), color: 'bg-emerald-500' },
      { value: 'Warning', label: t('project.statusWarning'), color: 'bg-amber-500' },
      { value: 'At Risk', label: t('project.statusAtRisk'), color: 'bg-red-500' },
    ],
    [t],
  );

  // Filter phases based on view mode and status
  const filteredPhases = useMemo(() => {
    return phases.filter((phase) => {
      // Filter by status
      if (!selectedStatuses.includes(phase.status as PhaseStatus)) {
        return false;
      }

      // Filter by view mode
      if (viewMode === 'estimate') {
        // Only show phases with both startDate and endDate
        return phase.startDate && phase.endDate;
      } else {
        // Only show phases with both actualStartDate and actualEndDate
        return phase.actualStartDate && phase.actualEndDate;
      }
    });
  }, [phases, selectedStatuses, viewMode]);

  const timelineData = useMemo(() => {
    if (filteredPhases.length === 0) return null;

    // Sort by display order
    const sorted = [...filteredPhases].sort((a, b) => a.displayOrder - b.displayOrder);

    const tasks: GanttTask[] = sorted.map((phase) => {
      let start: Date;
      let end: Date;

      if (viewMode === 'estimate') {
        start = toDate(phase.startDate);
        end = phase.endDate ? toDate(phase.endDate) : addDays(start, 1);
      } else {
        start = phase.actualStartDate ? toDate(phase.actualStartDate) : new Date();
        end = phase.actualEndDate ? toDate(phase.actualEndDate) : addDays(start, 1);
      }

      const statusClass = `gantt-status-${phase.status.replace(/\s+/g, '-').toLowerCase()}`;
      const progressClass = phase.progress >= 100 ? 'gantt-complete' : 'gantt-in-progress';
      const combinedClass = `${statusClass}-${progressClass}`;

      return {
        id: String(phase.id),
        name: phase.name,
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
        progress: Math.max(0, Math.min(100, Math.round(phase.progress))),
        custom_class: combinedClass,
      };
    });

    const minDate = tasks.reduce((minValue, task) => {
      const taskStart = toDate(task.start);
      return taskStart < minValue ? taskStart : minValue;
    }, toDate(tasks[0].start));
    const maxDate = tasks.reduce((maxValue, task) => {
      const taskEnd = toDate(task.end);
      return taskEnd > maxValue ? taskEnd : maxValue;
    }, toDate(tasks[0].end));

    return {
      tasks,
      startDate: minDate,
      endDate: maxDate,
      phases: sorted,
    };
  }, [filteredPhases, viewMode]);

  const toggleStatus = (status: PhaseStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  };

  useEffect(() => {
    if (!timelineData || !containerRef.current) return;
    containerRef.current.innerHTML = '';

    // Inject custom CSS
    const styleId = 'gantt-custom-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('div');
      styleElement.id = styleId;
      styleElement.innerHTML = weekendStyle;
      document.head.appendChild(styleElement);
    }

    const gantt = new Gantt(containerRef.current, timelineData.tasks, {
      view_mode: view,
      popup_trigger: 'click',
      readonly: false, // Enable drag & drop
      bar_height: 30,
      bar_corner_radius: 3,
      arrow_curve: 5,
      padding: 18,
      date_format: 'YYYY-MM-DD',
      language: 'en',

      // Custom popup với nhiều thông tin hơn
      custom_popup_html: (task) => {
        const phase = timelineData.phases.find((item) => String(item.id) === String(task.id));
        if (!phase) return '';

        let startLabel: string;
        let endLabel: string;

        if (viewMode === 'estimate') {
          startLabel = format(toDate(phase.startDate), 'MMM dd, yyyy');
          endLabel = phase.endDate
            ? format(toDate(phase.endDate), 'MMM dd, yyyy')
            : t('phase.timeline.noEndDate');
        } else {
          startLabel = phase.actualStartDate
            ? format(toDate(phase.actualStartDate), 'MMM dd, yyyy')
            : '-';
          endLabel = phase.actualEndDate
            ? format(toDate(phase.actualEndDate), 'MMM dd, yyyy')
            : '-';
        }

        const statusColor =
          phase.status === 'Good' ? '#10b981' :
          phase.status === 'Warning' ? '#f59e0b' : '#ef4444';

        return `
          <div style="padding:14px;font-size:13px;color:#374151;min-width:250px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <p style="font-size:15px;font-weight:600;color:#111827;margin:0;">${phase.name}</p>
              <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${statusColor};color:white;">${phase.status}</span>
            </div>
            <div style="display:grid;gap:6px;">
              <div>
                <p style="font-size:11px;color:#6b7280;margin:0 0 2px 0;">${viewMode === 'estimate' ? 'Estimate Time' : 'Actual Time'}</p>
                <p style="margin:0;font-weight:500;">${startLabel} → ${endLabel}</p>
              </div>
              <div style="margin-top:4px;">
                <p style="font-size:11px;color:#6b7280;margin:0 0 4px 0;">Progress</p>
                <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;">
                  <div style="background:#3b82f6;height:100%;width:${phase.progress}%;transition:width 0.3s;"></div>
                </div>
                <p style="margin:4px 0 0 0;font-size:12px;font-weight:600;color:#3b82f6;">${phase.progress.toFixed(1)}%</p>
              </div>
              <p style="margin:8px 0 0 0;font-size:11px;color:#6b7280;">💡 Drag to change dates • Resize to adjust duration</p>
            </div>
          </div>
        `;
      },

      // Callback khi user drag để thay đổi dates
      on_date_change: (task, start, end) => {
        const phase = timelineData.phases.find((p) => String(p.id) === String(task.id));
        if (!phase) return;

        const updateData: Partial<Phase> = {};

        if (viewMode === 'estimate') {
          updateData.startDate = format(start, 'yyyy-MM-dd');
          updateData.endDate = format(end, 'yyyy-MM-dd');
        } else {
          updateData.actualStartDate = format(start, 'yyyy-MM-dd');
          updateData.actualEndDate = format(end, 'yyyy-MM-dd');
        }

        updatePhaseMutation.mutate({ id: phase.id, data: updateData });
      },

      // Callback khi user thay đổi progress
      on_progress_change: (task, progress) => {
        const phase = timelineData.phases.find((p) => String(p.id) === String(task.id));
        if (!phase) return;

        updatePhaseMutation.mutate({
          id: phase.id,
          data: { progress: Math.round(progress) }
        });
      },

      on_view_change: (mode) => {
        const newView = mode as TimelineView;
        setView(newView);
      },
    });

    gantt.change_view_mode(view);
    ganttInstanceRef.current = gantt;

    return () => {
      ganttInstanceRef.current = null;
    };
  }, [timelineData, t, view, viewMode, updatePhaseMutation]);

  useEffect(() => {
    const wrapper = scrollRef.current;
    if (!wrapper) return;

    const handleWheel = (event: WheelEvent) => {
      if (isDispatchingWheel.current) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.gantt-container')) {
        return;
      }
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      isDispatchingWheel.current = true;
      try {
        wrapper.dispatchEvent(
          new WheelEvent('wheel', {
            deltaX: 0,
            deltaY: event.deltaY,
            deltaMode: event.deltaMode,
            bubbles: true,
            cancelable: true,
          }),
        );
      } finally {
        isDispatchingWheel.current = false;
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      wrapper.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('phase.timeline.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle - Always visible */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-blue-900">{t('phase.timelineFrappe.viewMode')}</span>
        </div>
        <div className="flex gap-2">
          {(['estimate', 'actual'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-blue-600 hover:bg-blue-100'
              }`}
            >
              {t(`phase.timelineFrappe.mode.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Controls: Time Scale & Status Filter - Always visible */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t('phase.timeline.viewLabel')}</span>
          {(['Day', 'Week', 'Month'] as TimelineView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                view === option
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {t(`phase.timeline.view.${option.toLowerCase()}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t('phase.timelineFrappe.filterLabel')}</span>
          {statusOptions.map((status) => {
            const selected = selectedStatuses.includes(status.value);
            return (
              <button
                key={status.value}
                type="button"
                onClick={() => toggleStatus(status.value)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  selected
                    ? 'border-gray-300 bg-white text-gray-800 shadow-sm'
                    : 'border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                {status.label}
              </button>
            );
          })}
        </div>
      </div>

      {!timelineData ? (
        // Empty state when no phases match the filter
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-16 text-sm text-gray-500">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="font-medium text-gray-700 mb-1">
              {viewMode === 'estimate'
                ? t('phase.timelineFrappe.noEstimatePhases')
                : t('phase.timelineFrappe.noActualPhases')}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {viewMode === 'actual'
                ? t('phase.timelineFrappe.switchToEstimate')
                : t('phase.timelineFrappe.addPhaseDates')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header with Date Range and Phase Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-3 border border-blue-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                📅 {format(timelineData.startDate, 'MMM dd, yyyy')} - {format(timelineData.endDate, 'MMM dd, yyyy')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {filteredPhases.length} {filteredPhases.length === 1 ? 'phase' : 'phases'} • {viewMode === 'estimate' ? 'Estimate' : 'Actual'} view
              </p>
            </div>
            <div className="text-xs text-gray-600 bg-white px-3 py-2 rounded-md shadow-sm">
              <p className="font-medium">💡 Interactive Timeline</p>
              <p className="mt-1">Drag to move • Resize edges • Click for details</p>
            </div>
          </div>

          {/* Gantt Chart */}
          <div ref={scrollRef} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-auto">
            <div className="gantt-frappe-wrapper p-4" ref={containerRef} />
          </div>
        </>
      )}
    </div>
  );
};
