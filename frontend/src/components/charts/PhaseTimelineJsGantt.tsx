import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Phase } from '@/types';

// Import jsgantt-improved
// @ts-ignore - jsgantt-improved doesn't have TypeScript definitions
import JSGantt from 'jsgantt-improved';
import 'jsgantt-improved/dist/jsgantt.css';

interface PhaseTimelineJsGanttProps {
  phases: Phase[];
}

type ViewMode = 'estimate' | 'actual';
type TimeScale = 'day' | 'week' | 'month';

const toDate = (value: string) => new Date(value);

export const PhaseTimelineJsGantt = ({ phases }: PhaseTimelineJsGanttProps) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('estimate');
  const [timeScale, setTimeScale] = useState<TimeScale>('week');
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
    const g = new JSGantt.GanttChart(ganttDiv, 'week');

    // Configure the gantt chart
    g.setShowRes(0); // Don't show resource column
    g.setShowDur(1); // Show duration column
    g.setShowComp(1); // Show completion column
    g.setShowStartDate(1); // Show start date column
    g.setShowEndDate(1); // Show end date column
    g.setCaptionType('Complete'); // Set caption type
    g.setQuarterColWidth(36);
    g.setDateTaskDisplayFormat('day dd month yyyy'); // Set date format
    g.setDayMajorDateDisplayFormat('mon yyyy');
    g.setWeekMinorDateDisplayFormat('dd mon');
    g.setShowTaskInfoLink(0); // Don't show info link
    g.setShowEndWeekDate(0);
    g.setUseSingleCell(10000);

    // Set format based on time scale
    if (timeScale === 'day') {
      g.setFormat('day');
    } else if (timeScale === 'week') {
      g.setFormat('week');
    } else {
      g.setFormat('month');
    }

    // Add tasks to gantt chart
    sortedPhases.forEach((phase) => {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'estimate') {
        startDate = toDate(phase.startDate);
        endDate = phase.endDate ? toDate(phase.endDate) : startDate;
      } else {
        startDate = phase.actualStartDate ? toDate(phase.actualStartDate) : new Date();
        endDate = phase.actualEndDate ? toDate(phase.actualEndDate) : startDate;
      }

      // Determine color based on status
      let color = '#4ade80'; // Good - green
      if (phase.status === 'Warning') {
        color = '#fbbf24'; // Warning - yellow
      } else if (phase.status === 'At Risk') {
        color = '#f87171'; // At Risk - red
      }

      // Add task
      g.AddTaskItem(new JSGantt.TaskItem(
        phase.id, // pID
        phase.name, // pName
        format(startDate, 'yyyy-MM-dd'), // pStart
        format(endDate, 'yyyy-MM-dd'), // pEnd
        color, // pColor
        '', // pLink
        0, // pMile (milestone)
        '', // pRes (resource)
        Math.round(phase.progress), // pComp (completion %)
        0, // pGroup (is group?)
        0, // pParent
        1, // pOpen
        '', // pDepend
        '', // pCaption
        0, // pNotes
        phase.status // pGanttBar - use status for tooltip
      ));
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
          {(['day', 'week', 'month'] as TimeScale[]).map((scale) => (
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
              {t(`phase.timeline.view.${scale}`)}
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
