import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays, format } from 'date-fns';
import type { Phase } from '@/types';

interface PhaseTimelineGanttProps {
  phases: Phase[];
}

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
  const todayLeft = (todayOffset / totalDays) * 100;

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

      <div className="space-y-4">
        {timelineData.phases.map((phase) => {
          const plannedStartOffset = differenceInCalendarDays(phase.plannedStart, timelineData.minDate);
          const plannedDuration = getDurationDays(phase.plannedStart, phase.plannedEnd);
          const actualEnd = clampDate(phase.actualEnd, phase.plannedStart, timelineData.maxDate);
          const actualDuration = getDurationDays(phase.plannedStart, actualEnd);
          const plannedLeft = (plannedStartOffset / totalDays) * 100;
          const plannedWidth = (plannedDuration / totalDays) * 100;
          const actualWidth = (actualDuration / totalDays) * 100;

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
                <div className="relative h-10 rounded-lg bg-gray-100">
                  {todayOffset >= 0 && todayOffset <= totalDays ? (
                    <span
                      className="absolute top-0 h-full w-0.5 rounded bg-red-500/70"
                      style={{ left: `${Math.min(100, Math.max(0, todayLeft))}%` }}
                    />
                  ) : null}
                  <span
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-blue-200"
                    style={{
                      left: `${plannedLeft}%`,
                      width: `${Math.max(0.5, plannedWidth)}%`,
                    }}
                  />
                  <span
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-blue-600"
                    style={{
                      left: `${plannedLeft}%`,
                      width: `${Math.max(0.5, actualWidth)}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{format(phase.plannedStart, 'MMM dd')}</span>
                  <span>{format(phase.plannedEnd, 'MMM dd')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
