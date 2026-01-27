import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Phase } from '@/types';

// Import jsgantt-improved
// @ts-ignore - jsgantt-improved doesn't have TypeScript definitions
import { JSGantt } from 'jsgantt-improved';
import 'jsgantt-improved/dist/jsgantt.css';

interface PhaseTimelineJsGanttProps {
  phases: Phase[];
}

type ViewMode = 'estimate' | 'actual';
type TimeScale = 'Day' | 'Week' | 'Month';

const toDate = (value: string) => new Date(value);

export const PhaseTimelineJsGantt = ({ phases }: PhaseTimelineJsGanttProps) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('estimate');
  const [timeScale, setTimeScale] = useState<TimeScale>('Week');
  const ganttRef = useRef<HTMLDivElement | null>(null);
  const ganttChartRef = useRef<any>(null);

  // Filter phases based on view mode
  const filteredPhases = useMemo(() => {
    if (viewMode === 'estimate') {
      // Only show phases with both startDate and endDate
      return phases.filter((phase) => phase.startDate && phase.endDate);
    } else {
      // Only show phases with both actualStartDate and actualEndDate
      return phases.filter((phase) => phase.actualStartDate && phase.actualEndDate);
    }
  }, [phases, viewMode]);

  // Sort phases by display order
  const sortedPhases = useMemo(() => {
    return [...filteredPhases].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [filteredPhases]);

  useEffect(() => {
    if (!ganttRef.current || sortedPhases.length === 0) return;

    // Clear previous chart
    ganttRef.current.innerHTML = '';

    // Create a new div for the gantt chart
    const ganttDiv = document.createElement('div');
    ganttDiv.id = 'gantt-chart-container';
    ganttDiv.style.position = 'relative';
    ganttDiv.style.width = '100%';
    ganttRef.current.appendChild(ganttDiv);

    // Initialize JSGantt
    const g = new JSGantt.GanttChart(ganttDiv, timeScale);

    // Configure the gantt chart using setOptions
    g.setOptions({
      vCaptionType: 'Complete',
      vQuarterColWidth: 36,
      vDateTaskDisplayFormat: 'day dd month yyyy',
      vDayMajorDateDisplayFormat: 'mon yyyy - Week ww',
      vWeekMinorDateDisplayFormat: 'dd mon',
      vShowTaskInfoLink: 0,
      vShowEndWeekDate: 0,
      vUseSingleCell: 10000,
      vFormatArr: ['Day', 'Week', 'Month'],
      vShowRes: 0,
      vShowDur: 1,
      vShowComp: 1,
      vShowStartDate: 1,
      vShowEndDate: 1,
    });

    // Add tasks to gantt chart
    sortedPhases.forEach((phase, index) => {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'estimate') {
        startDate = toDate(phase.startDate);
        endDate = phase.endDate ? toDate(phase.endDate) : startDate;
      } else {
        startDate = phase.actualStartDate ? toDate(phase.actualStartDate) : new Date();
        endDate = phase.actualEndDate ? toDate(phase.actualEndDate) : startDate;
      }

      // Determine class based on status
      let pClass = 'gtaskgreen'; // Good - green
      if (phase.status === 'Warning') {
        pClass = 'gtaskyellow'; // Warning - yellow
      } else if (phase.status === 'At Risk') {
        pClass = 'gtaskred'; // At Risk - red
      }

      // Add task using AddTaskItemObject
      g.AddTaskItemObject({
        pID: phase.id,
        pName: phase.name,
        pStart: format(startDate, 'yyyy-MM-dd'),
        pEnd: format(endDate, 'yyyy-MM-dd'),
        pClass: pClass,
        pLink: '',
        pMile: 0,
        pRes: '',
        pComp: Math.round(phase.progress),
        pGroup: 0,
        pParent: 0,
        pOpen: 1,
        pDepend: '',
        pCaption: '',
        pNotes: `Status: ${phase.status}`,
      });
    });

    // Draw the chart
    g.Draw();
    ganttChartRef.current = g;

    // Cleanup
    return () => {
      if (ganttRef.current) {
        ganttRef.current.innerHTML = '';
      }
    };
  }, [sortedPhases, viewMode, timeScale, t]);

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {t('phase.timeline.empty')}
      </div>
    );
  }

  if (filteredPhases.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-sm text-gray-500">
        {viewMode === 'estimate'
          ? t('phase.timelineJsGantt.noEstimatePhases')
          : t('phase.timelineJsGantt.noActualPhases')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode and Time Scale Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{t('phase.timelineJsGantt.viewMode')}</span>
          {(['estimate', 'actual'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t(`phase.timelineJsGantt.mode.${mode}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">{t('phase.timelineJsGantt.timeScale')}</span>
          {(['Day', 'Week', 'Month'] as TimeScale[]).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setTimeScale(scale)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                timeScale === scale
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t(`phase.timeline.view.${scale.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-green-400" />
          {t('project.statusGood')}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-yellow-400" />
          {t('project.statusWarning')}
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-full bg-red-400" />
          {t('project.statusAtRisk')}
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 overflow-auto">
        <div ref={ganttRef} className="w-full" />
      </div>
    </div>
  );
};
