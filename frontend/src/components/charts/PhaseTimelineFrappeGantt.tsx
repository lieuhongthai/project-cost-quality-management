import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format } from 'date-fns';
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import type { Phase } from '@/types';

interface PhaseTimelineFrappeGanttProps {
  phases: Phase[];
}

type TimelineView = 'Day' | 'Week' | 'Month';
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

export const PhaseTimelineFrappeGantt = ({ phases }: PhaseTimelineFrappeGanttProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState<TimelineView>('Week');
  const [selectedStatuses, setSelectedStatuses] = useState<PhaseStatus[]>([
    'Good',
    'Warning',
    'At Risk',
  ]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const statusOptions: { value: PhaseStatus; label: string; color: string }[] = useMemo(
    () => [
      { value: 'Good', label: t('project.statusGood'), color: 'bg-emerald-500' },
      { value: 'Warning', label: t('project.statusWarning'), color: 'bg-amber-500' },
      { value: 'At Risk', label: t('project.statusAtRisk'), color: 'bg-red-500' },
    ],
    [t],
  );

  const filteredPhases = useMemo(
    () => phases.filter((phase) => selectedStatuses.includes(phase.status as PhaseStatus)),
    [phases, selectedStatuses],
  );

  const timelineData = useMemo(() => {
    if (filteredPhases.length === 0) return null;
    const sorted = [...filteredPhases].sort(
      (a, b) => toDate(a.startDate).getTime() - toDate(b.startDate).getTime(),
    );

    const tasks: GanttTask[] = sorted.map((phase) => {
      const plannedStart = toDate(phase.startDate);
      const plannedEnd = phase.endDate ? toDate(phase.endDate) : addDays(plannedStart, 1);
      const statusClass = `gantt-status-${phase.status.replace(/\s+/g, '-').toLowerCase()}`;
      const progressClass = phase.progress >= 100 ? 'gantt-complete' : 'gantt-in-progress';
      const combinedClass = `${statusClass}-${progressClass}`;
      return {
        id: String(phase.id),
        name: phase.name,
        start: format(plannedStart, 'yyyy-MM-dd'),
        end: format(plannedEnd, 'yyyy-MM-dd'),
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
  }, [filteredPhases]);

  const toggleStatus = (status: PhaseStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  };

  useEffect(() => {
    if (!timelineData || !containerRef.current) return;
    containerRef.current.innerHTML = '';

    const gantt = new Gantt(containerRef.current, timelineData.tasks, {
      view_mode: view,
      popup_trigger: 'hover',
      readonly: true,
      custom_popup_html: (task) => {
        const phase = timelineData.phases.find((item) => String(item.id) === String(task.id));
        if (!phase) return '';
        const plannedStart = format(toDate(phase.startDate), 'MMM dd, yyyy');
        const plannedEnd = phase.endDate
          ? format(toDate(phase.endDate), 'MMM dd, yyyy')
          : t('phase.timeline.noEndDate');
        const actualEnd = phase.endDate
          ? format(toDate(phase.endDate), 'MMM dd, yyyy')
          : plannedEnd;
        return `
          <div style="padding:12px;font-size:12px;color:#374151;">
            <p style="font-size:14px;font-weight:600;color:#111827;">${phase.name}</p>
            <div style="margin-top:8px;display:grid;gap:4px;">
              <p>${t('phase.timeline.plannedRange', { start: plannedStart, end: plannedEnd })}</p>
              <p>${t('phase.timeline.actualRange', { end: actualEnd })}</p>
              <p>${t('phase.timeline.tooltip.progress', { progress: phase.progress.toFixed(1) })}</p>
            </div>
          </div>
        `;
      },
      on_view_change: (mode) => {
        const viewMode = mode as TimelineView;
        setView(viewMode);
      },
    });

    gantt.change_view_mode(view);
  }, [timelineData, t, view]);

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('phase.timeline.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {format(timelineData.startDate, 'MMM dd, yyyy')} - {format(timelineData.endDate, 'MMM dd, yyyy')}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-blue-500" />
            {t('phase.timeline.planned')}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-emerald-500" />
            {t('phase.timeline.actual')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{t('phase.timeline.viewLabel')}</span>
          {(['Day', 'Week', 'Month'] as TimelineView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                view === option
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t(`phase.timeline.view.${option.toLowerCase()}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{t('phase.timelineFrappe.filterLabel')}</span>
          {statusOptions.map((status) => {
            const selected = selectedStatuses.includes(status.value);
            return (
              <button
                key={status.value}
                type="button"
                onClick={() => toggleStatus(status.value)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selected
                    ? 'border-transparent bg-white text-gray-700 shadow-sm'
                    : 'border-gray-200 bg-gray-100 text-gray-400'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${status.color}`} />
                {status.label}
              </button>
            );
          })}
        </div>
      </div>

      {timelineData ? (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="gantt-frappe-wrapper" ref={containerRef} />
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
          {t('phase.timelineFrappe.emptyFiltered')}
        </div>
      )}
    </div>
  );
};
