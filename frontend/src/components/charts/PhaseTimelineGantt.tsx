import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Phase } from '@/types';

interface PhaseTimelineGanttProps {
  phases: Phase[];
}

type TimelineView = 'day' | 'week' | 'month';

interface TimelinePhase extends Phase {
  plannedStart: Date;
  plannedEnd: Date;
  actualEnd: Date;
  gapDays?: number;
  overlapDays?: number;
  delayDays?: number;
  hasEndDate: boolean;
}

const toDate = (value: string) => new Date(value);

const clampDate = (value: Date, min: Date, max: Date) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const getDurationDays = (start: Date, end: Date) =>
  Math.max(1, differenceInCalendarDays(end, start) + 1);

export const PhaseTimelineGantt = ({ phases }: PhaseTimelineGanttProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState<TimelineView>('week');

  const timelineData = useMemo(() => {
    if (phases.length === 0) return null;

    const sorted = [...phases].sort(
      (a, b) => toDate(a.startDate).getTime() - toDate(b.startDate).getTime(),
    );
    const today = new Date();

    const mapped: TimelinePhase[] = sorted.map((phase, index) => {
      const plannedStart = toDate(phase.startDate);
      const hasEndDate = Boolean(phase.endDate);
      const plannedEnd = phase.endDate ? toDate(phase.endDate) : plannedStart;
      const actualEndCandidate = phase.progress >= 100 && phase.endDate ? plannedEnd : today;
      const actualEnd = actualEndCandidate < plannedStart ? plannedStart : actualEndCandidate;

      let gapDays: number | undefined;
      let overlapDays: number | undefined;
      if (index > 0) {
        const prevEnd = sorted[index - 1].endDate
          ? toDate(sorted[index - 1].endDate as string)
          : toDate(sorted[index - 1].startDate);
        const diff = differenceInCalendarDays(plannedStart, prevEnd);
        if (diff > 0) {
          gapDays = diff;
        } else if (diff < 0) {
          overlapDays = Math.abs(diff);
        }
      }

      let delayDays: number | undefined;
      if (phase.endDate && today > plannedEnd && phase.progress < 100) {
        delayDays = differenceInCalendarDays(today, plannedEnd);
      }

      return {
        ...phase,
        plannedStart,
        plannedEnd,
        actualEnd,
        gapDays,
        overlapDays,
        delayDays,
        hasEndDate,
      };
    });

    const minDate = mapped.reduce(
      (minValue, phase) => (phase.plannedStart < minValue ? phase.plannedStart : minValue),
      mapped[0].plannedStart,
    );
    const maxDate = mapped.reduce((maxValue, phase) => {
      const latest = phase.actualEnd > phase.plannedEnd ? phase.actualEnd : phase.plannedEnd;
      return latest > maxValue ? latest : maxValue;
    }, mapped[0].plannedEnd);

    return {
      phases: mapped,
      minDate,
      maxDate,
      today,
    };
  }, [phases]);

  if (!timelineData) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('phase.timeline.empty')}
      </div>
    );
  }

  const totalDays = getDurationDays(timelineData.minDate, timelineData.maxDate);
  const todayOffset = differenceInCalendarDays(timelineData.today, timelineData.minDate);
  const dayWidth = view === 'day' ? 24 : view === 'week' ? 8 : 3;
  const totalWidth = Math.max(600, totalDays * dayWidth);
  const todayLeftPx = todayOffset * dayWidth;

  const tickSpans = useMemo(() => {
    if (!timelineData) return [];
    const ticks: Date[] = [];
    let cursor =
      view === 'month'
        ? startOfMonth(timelineData.minDate)
        : view === 'week'
          ? startOfWeek(timelineData.minDate, { weekStartsOn: 1 })
          : timelineData.minDate;
    while (cursor <= timelineData.maxDate) {
      ticks.push(cursor);
      if (view === 'month') {
        cursor = addMonths(cursor, 1);
      } else if (view === 'week') {
        cursor = addWeeks(cursor, 1);
      } else {
        cursor = addDays(cursor, 1);
      }
    }

    return ticks.map((tick, index) => {
      const nextTick = ticks[index + 1] ?? addDays(timelineData.maxDate, 1);
      const widthDays = Math.max(1, differenceInCalendarDays(nextTick, tick));
      const label =
        view === 'month'
          ? format(tick, 'MMM yyyy')
          : view === 'week'
            ? format(tick, 'MMM dd')
            : format(tick, 'dd MMM');
      return {
        label,
        widthPx: widthDays * dayWidth,
      };
    });
  }, [dayWidth, timelineData, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {format(timelineData.minDate, 'MMM dd, yyyy')} - {format(timelineData.maxDate, 'MMM dd, yyyy')}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-blue-200" />
            {t('phase.timeline.planned')}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-blue-600" />
            {t('phase.timeline.actual')}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {t('phase.timeline.today')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">{t('phase.timeline.viewLabel')}</span>
        <div className="flex flex-wrap gap-2">
          {(['day', 'week', 'month'] as TimelineView[]).map((option) => (
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
              {t(`phase.timeline.view.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <div className="flex h-6 items-start" style={{ width: `${totalWidth}px` }}>
            {tickSpans.map((tick, index) => (
              <div
                key={`${tick.label}-${index}`}
                className="relative flex h-6 items-start text-[10px] text-gray-400"
                style={{ width: `${tick.widthPx}px` }}
              >
                <span className="absolute left-0 top-0 h-2 w-px bg-gray-200" />
                <span className="mt-1 w-full text-center">{tick.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-4">
            {timelineData.phases.map((phase) => {
              const plannedStartOffset = differenceInCalendarDays(phase.plannedStart, timelineData.minDate);
              const plannedDuration = getDurationDays(phase.plannedStart, phase.plannedEnd);
              const actualEnd = clampDate(phase.actualEnd, phase.plannedStart, timelineData.maxDate);
              const actualDuration = getDurationDays(phase.plannedStart, actualEnd);
              const plannedLeftPx = plannedStartOffset * dayWidth;
              const plannedWidthPx = plannedDuration * dayWidth;
              const actualWidthPx = actualDuration * dayWidth;

              return (
                <div key={phase.id} className="grid gap-3 md:grid-cols-[220px_1fr]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{phase.name}</p>
                      {phase.delayDays ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          {t('phase.timeline.delayed', { days: phase.delayDays })}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('phase.timeline.plannedRange', {
                        start: format(phase.plannedStart, 'MMM dd, yyyy'),
                        end: phase.hasEndDate
                          ? format(phase.plannedEnd, 'MMM dd, yyyy')
                          : t('phase.timeline.noEndDate'),
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('phase.timeline.actualRange', {
                        end: format(phase.actualEnd, 'MMM dd, yyyy'),
                      })}
                    </p>
                    {phase.gapDays ? (
                      <p className="text-xs text-amber-600">
                        {t('phase.timeline.gap', { days: phase.gapDays })}
                      </p>
                    ) : null}
                    {phase.overlapDays ? (
                      <p className="text-xs text-purple-600">
                        {t('phase.timeline.overlap', { days: phase.overlapDays })}
                      </p>
                    ) : null}
                  </div>
                  <div className="relative">
                    <div className="relative h-12" style={{ width: `${totalWidth}px` }}>
                      <div className="absolute inset-0 rounded-lg bg-gray-100" />
                      {todayOffset >= 0 && todayOffset <= totalDays ? (
                        <span
                          className="absolute top-0 h-full w-0.5 rounded bg-red-500/70"
                          style={{ left: `${Math.min(totalWidth, Math.max(0, todayLeftPx))}px` }}
                        />
                      ) : null}
                      <div className="group absolute inset-0">
                        <span
                          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-blue-200"
                          style={{
                            left: `${plannedLeftPx}px`,
                            width: `${Math.max(8, plannedWidthPx)}px`,
                          }}
                        />
                        <span
                          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-blue-600"
                          style={{
                            left: `${plannedLeftPx}px`,
                            width: `${Math.max(8, actualWidthPx)}px`,
                          }}
                        />
                        <div className="pointer-events-none absolute left-0 top-0 z-10 w-72 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 opacity-0 shadow-lg transition group-hover:opacity-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {t('phase.timeline.tooltip.title', { name: phase.name })}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p>
                              {t('phase.timeline.tooltip.planned', {
                                start: format(phase.plannedStart, 'MMM dd, yyyy'),
                                end: format(phase.plannedEnd, 'MMM dd, yyyy'),
                              })}
                            </p>
                            <p>
                              {t('phase.timeline.tooltip.actual', {
                                end: format(phase.actualEnd, 'MMM dd, yyyy'),
                              })}
                            </p>
                            <p>
                              {t('phase.timeline.tooltip.progress', {
                                progress: phase.progress.toFixed(1),
                              })}
                            </p>
                            {phase.delayDays ? (
                              <p className="text-red-600">
                                {t('phase.timeline.delayed', { days: phase.delayDays })}
                              </p>
                            ) : null}
                            {phase.gapDays ? (
                              <p className="text-amber-600">
                                {t('phase.timeline.gap', { days: phase.gapDays })}
                              </p>
                            ) : null}
                            {phase.overlapDays ? (
                              <p className="text-purple-600">
                                {t('phase.timeline.overlap', { days: phase.overlapDays })}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="mt-1 flex items-center justify-between text-[11px] text-gray-400"
                      style={{ width: `${totalWidth}px` }}
                    >
                      <span>{format(phase.plannedStart, 'MMM dd')}</span>
                      <span>{format(phase.plannedEnd, 'MMM dd')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
