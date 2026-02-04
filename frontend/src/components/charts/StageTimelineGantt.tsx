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
import type { StageOverviewData } from '@/types';

interface StageTimelineGanttProps {
  stages: StageOverviewData[];
}

type TimelineView = 'day' | 'week' | 'month';

interface TimelineStage extends StageOverviewData {
  plannedStart: Date;
  plannedEnd: Date;
  actualStart: Date;
  actualEnd: Date;
  gapDays?: number;
  overlapDays?: number;
  delayDays?: number;
  hasEndDate: boolean;
  hasActualStart: boolean;
}

const toDate = (value: string) => new Date(value);

const clampDate = (value: Date, min: Date, max: Date) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const getDurationDays = (start: Date, end: Date) =>
  Math.max(1, differenceInCalendarDays(end, start) + 1);

export const StageTimelineGantt = ({ stages }: StageTimelineGanttProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState<TimelineView>('week');
  const labelColumnWidth = 220;

  const timelineData = useMemo(() => {
    if (stages.length === 0) return null;

    const sorted = [...stages].sort((a, b) => {
      const aStart = a.startDate ? toDate(a.startDate).getTime() : 0;
      const bStart = b.startDate ? toDate(b.startDate).getTime() : 0;
      return aStart - bStart;
    });
    const today = new Date();

    const mapped: TimelineStage[] = sorted.map((stage, index) => {
      const progress = stage.progress ?? 0;
      const plannedStart = stage.startDate ? toDate(stage.startDate) : today;
      const hasEndDate = Boolean(stage.endDate);
      const plannedEnd = stage.endDate ? toDate(stage.endDate) : plannedStart;
      const hasActualStart = Boolean(stage.actualStartDate);
      const actualStart = stage.actualStartDate ? toDate(stage.actualStartDate) : plannedStart;
      const actualEndCandidate = stage.actualEndDate
        ? toDate(stage.actualEndDate)
        : progress > 0
          ? today
          : actualStart;
      const actualEnd = actualEndCandidate < actualStart ? actualStart : actualEndCandidate;

      let gapDays: number | undefined;
      let overlapDays: number | undefined;
      if (index > 0) {
        const prevEnd = sorted[index - 1].endDate
          ? toDate(sorted[index - 1].endDate as string)
          : sorted[index - 1].startDate
            ? toDate(sorted[index - 1].startDate as string)
            : today;
        const diff = differenceInCalendarDays(plannedStart, prevEnd);
        if (diff > 0) {
          gapDays = diff;
        } else if (diff < 0) {
          overlapDays = Math.abs(diff);
        }
      }

      let delayDays: number | undefined;
      if (stage.endDate && today > plannedEnd && progress < 100) {
        delayDays = differenceInCalendarDays(today, plannedEnd);
      }

      return {
        ...stage,
        progress,
        plannedStart,
        plannedEnd,
        actualStart,
        actualEnd,
        gapDays,
        overlapDays,
        delayDays,
        hasEndDate,
        hasActualStart,
      };
    });

    const minDate = mapped.reduce(
      (minValue, stage) => {
        const candidate = stage.actualStart < stage.plannedStart ? stage.actualStart : stage.plannedStart;
        return candidate < minValue ? candidate : minValue;
      },
      mapped[0].plannedStart,
    );
    const maxDate = mapped.reduce((maxValue, stage) => {
      const latest = stage.actualEnd > stage.plannedEnd ? stage.actualEnd : stage.plannedEnd;
      return latest > maxValue ? latest : maxValue;
    }, mapped[0].plannedEnd);

    return {
      stages: mapped,
      minDate,
      maxDate,
      today,
    };
  }, [stages]);

  const dayWidth = view === 'day' ? 24 : view === 'week' ? 8 : 3;

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
      const widthPx = widthDays * dayWidth;
      const label =
        view === 'month'
          ? format(tick, 'MMM yyyy')
          : view === 'week'
            ? format(tick, 'MMM dd')
            : format(tick, 'dd MMM');
      const markerOffsetPx = view === 'day' ? widthPx / 2 : 0;
      return {
        label,
        widthPx,
        markerOffsetPx,
      };
    });
  }, [dayWidth, timelineData, view]);

  if (!timelineData) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('stages.timeline.empty')}
      </div>
    );
  }

  const totalDays = getDurationDays(timelineData.minDate, timelineData.maxDate);
  const todayOffset = differenceInCalendarDays(timelineData.today, timelineData.minDate);
  const totalWidth = Math.max(600, totalDays * dayWidth);
  const todayLeftPx = todayOffset * dayWidth;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {format(timelineData.minDate, 'MMM dd, yyyy')} - {format(timelineData.maxDate, 'MMM dd, yyyy')}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-blue-200" />
            {t('stages.timeline.planned')}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-blue-600" />
            {t('stages.timeline.actual')}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {t('stages.timeline.today')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">{t('stages.timeline.viewLabel')}</span>
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
              {t(`stages.timeline.view.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <div className="space-y-4">
            <div className="hidden h-6 md:block" style={{ width: `${labelColumnWidth}px` }} />
            {timelineData.stages.map((stage) => (
              <div key={stage.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{stage.name}</p>
                  {stage.delayDays ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {t('stages.timeline.delayed', { days: stage.delayDays })}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500">
                  {t('stages.timeline.plannedRange', {
                    start: format(stage.plannedStart, 'MMM dd, yyyy'),
                    end: stage.hasEndDate
                      ? format(stage.plannedEnd, 'MMM dd, yyyy')
                      : t('stages.timeline.noEndDate'),
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {t('stages.timeline.actualRange', {
                    end: format(stage.actualEnd, 'MMM dd, yyyy'),
                  })}
                </p>
                {stage.gapDays ? (
                  <p className="text-xs text-gray-500">
                    {t('stages.timeline.gap', { days: stage.gapDays })}
                  </p>
                ) : null}
                {stage.overlapDays ? (
                  <p className="text-xs text-gray-500">
                    {t('stages.timeline.overlap', { days: stage.overlapDays })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto pb-4">
            <div style={{ minWidth: `${totalWidth}px` }}>
              <div className="sticky top-0 z-10 flex items-center bg-white text-xs text-gray-500">
                {tickSpans.map((tick) => (
                  <div
                    key={tick.label}
                    className="relative border-r border-gray-100 py-1 text-center"
                    style={{ width: tick.widthPx }}
                  >
                    <span className="relative z-10">{tick.label}</span>
                  </div>
                ))}
              </div>
              <div className="relative">
                <div
                  className="absolute bottom-0 top-0 w-px bg-red-500"
                  style={{ left: `${todayLeftPx}px` }}
                />
                <div className="space-y-4">
                  {timelineData.stages.map((stage) => {
                    const plannedStartOffset = differenceInCalendarDays(stage.plannedStart, timelineData.minDate);
                    const plannedDuration = getDurationDays(stage.plannedStart, stage.plannedEnd);
                    const actualStart = clampDate(stage.actualStart, timelineData.minDate, timelineData.maxDate);
                    const actualEnd = clampDate(stage.actualEnd, actualStart, timelineData.maxDate);
                    const actualStartOffset = differenceInCalendarDays(actualStart, timelineData.minDate);
                    const actualDuration = getDurationDays(actualStart, actualEnd);
                    return (
                      <div key={stage.id} className="relative">
                        <div
                          className="absolute top-1 h-5 rounded-full bg-blue-200"
                          style={{
                            left: `${plannedStartOffset * dayWidth}px`,
                            width: `${plannedDuration * dayWidth}px`,
                          }}
                        />
                        {stage.hasActualStart ? (
                          <div
                            className="absolute top-1 h-5 rounded-full bg-blue-600"
                            style={{
                              left: `${actualStartOffset * dayWidth}px`,
                              width: `${actualDuration * dayWidth}px`,
                            }}
                          />
                        ) : null}
                        <div className="relative h-7">
                          <div
                            className="absolute top-7 w-full border-b border-gray-100"
                            style={{ left: 0 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs text-gray-500">
          {timelineData.stages.map((stage) => (
            <div key={stage.id} className="rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-semibold text-gray-800">
                {t('stages.timeline.tooltip.title', { name: stage.name })}
              </p>
              <p className="mt-1">
                {t('stages.timeline.tooltip.planned', {
                  start: format(stage.plannedStart, 'MMM dd, yyyy'),
                  end: format(stage.plannedEnd, 'MMM dd, yyyy'),
                })}
              </p>
              <p>
                {t('stages.timeline.tooltip.actual', {
                  end: format(stage.actualEnd, 'MMM dd, yyyy'),
                })}
              </p>
              <p>
                {t('stages.timeline.tooltip.progress', {
                  progress: stage.progress.toFixed(1),
                })}
              </p>
              {stage.delayDays ? (
                <p className="mt-1 text-red-600">
                  {t('stages.timeline.delayed', { days: stage.delayDays })}
                </p>
              ) : null}
              {stage.gapDays ? (
                <p className="text-gray-500">
                  {t('stages.timeline.gap', { days: stage.gapDays })}
                </p>
              ) : null}
              {stage.overlapDays ? (
                <p className="text-gray-500">
                  {t('stages.timeline.overlap', { days: stage.overlapDays })}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
