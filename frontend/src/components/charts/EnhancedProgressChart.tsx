import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from 'recharts';
import { Button } from '../common/Button';

type ChartType = 'line' | 'area' | 'bar' | 'composed';
type ViewMode = 'effort' | 'progress' | 'both';

interface ProgressDataPoint {
  week: string;
  planned: number;
  actual: number;
  progress: number;
  variance?: number;
  cumulative?: {
    planned: number;
    actual: number;
  };
}

interface EnhancedProgressChartProps {
  data: ProgressDataPoint[];
  showVariance?: boolean;
  showCumulative?: boolean;
  showTrendLine?: boolean;
  targetProgress?: number;
  height?: number;
  onExport?: (type: 'png' | 'svg') => void;
}

// Custom Tooltip
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {typeof entry.value === 'number' 
              ? entry.unit === '%' 
                ? `${entry.value.toFixed(1)}%`
                : entry.value.toFixed(2)
              : entry.value}
          </span>
        </div>
      ))}
      {payload.find(p => p.name === 'Variance') && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Status: {Number(payload.find(p => p.name === 'Variance')?.value) > 0 
              ? '⚠️ Over Budget' 
              : '✅ On Track'}
          </div>
        </div>
      )}
    </div>
  );
};

export const EnhancedProgressChart: React.FC<EnhancedProgressChartProps> = ({
  data,
  showVariance = false,
  showCumulative = false,
  showTrendLine = false,
  targetProgress = 100,
  height = 400,
  onExport,
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Calculate cumulative data if needed
  const enhancedData = useMemo(() => {
    if (!showCumulative) return data;

    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    return data.map((point) => {
      cumulativePlanned += point.planned;
      cumulativeActual += point.actual;

      return {
        ...point,
        cumulative: {
          planned: cumulativePlanned,
          actual: cumulativeActual,
        },
      };
    });
  }, [data, showCumulative]);

  // Calculate trend line (linear regression)
  const trendLineData = useMemo(() => {
    if (!showTrendLine || data.length < 2) return null;

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, point) => sum + point.actual, 0);
    const sumXY = data.reduce((sum, point, i) => sum + i * point.actual, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((point, i) => ({
      week: point.week,
      trend: slope * i + intercept,
    }));
  }, [data, showTrendLine]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPlanned = data.reduce((sum, p) => sum + p.planned, 0);
    const totalActual = data.reduce((sum, p) => sum + p.actual, 0);
    const avgProgress = data.reduce((sum, p) => sum + p.progress, 0) / data.length;
    const variance = totalActual - totalPlanned;
    const variancePercent = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0;

    return {
      totalPlanned: totalPlanned.toFixed(2),
      totalActual: totalActual.toFixed(2),
      avgProgress: avgProgress.toFixed(1),
      variance: variance.toFixed(2),
      variancePercent: variancePercent.toFixed(1),
      status: variance > 0 ? 'Over' : variance < 0 ? 'Under' : 'On Track',
    };
  }, [data]);

  // Export handler
  const handleExport = (type: 'png' | 'svg') => {
    if (onExport) {
      onExport(type);
    } else {
      console.log(`Exporting chart as ${type}`);
    }
  };

  // Render chart based on type and view mode
  const renderChart = () => {
    const commonProps = {
      data: enhancedData,
    };

    const effortLines = (
      <>
        <Line
          yAxisId="left"
          type="monotone"
          dataKey={showCumulative ? 'cumulative.planned' : 'planned'}
          stroke="#94a3b8"
          strokeWidth={2}
          name={showCumulative ? 'Cumulative Planned' : 'Planned Effort'}
          strokeDasharray="5 5"
          dot={{ r: 3 }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey={showCumulative ? 'cumulative.actual' : 'actual'}
          stroke="#0ea5e9"
          strokeWidth={2}
          name={showCumulative ? 'Cumulative Actual' : 'Actual Effort'}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        {showVariance && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="variance"
            stroke="#ef4444"
            strokeWidth={2}
            name="Variance"
            strokeDasharray="3 3"
            dot={{ r: 3 }}
          />
        )}
        {showTrendLine && trendLineData && (
          <Line
            yAxisId="left"
            type="monotone"
            data={trendLineData}
            dataKey="trend"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Trend"
            strokeDasharray="8 4"
            dot={false}
          />
        )}
      </>
    );

    const progressLine = (
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="progress"
        stroke="#10b981"
        strokeWidth={2}
        name="Progress %"
        dot={{ r: 4, fill: '#10b981' }}
        activeDot={{ r: 6 }}
      />
    );

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis 
              dataKey="week" 
              tick={{ fill: '#475569', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            {(viewMode === 'effort' || viewMode === 'both') && (
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Effort (MM)', angle: -90, position: 'insideLeft', style: { fill: '#475569' } }}
              />
            )}
            {(viewMode === 'progress' || viewMode === 'both') && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Progress (%)', angle: 90, position: 'insideRight', style: { fill: '#475569' } }}
                domain={[0, targetProgress]}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />}
            {targetProgress && (viewMode === 'progress' || viewMode === 'both') && (
              <ReferenceLine 
                yAxisId="right" 
                y={targetProgress} 
                stroke="#10b981" 
                strokeDasharray="3 3"
                label={{ value: 'Target', position: 'right', fill: '#10b981' }}
              />
            )}
            {(viewMode === 'effort' || viewMode === 'both') && effortLines}
            {(viewMode === 'progress' || viewMode === 'both') && progressLine}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis 
              dataKey="week" 
              tick={{ fill: '#475569', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            {(viewMode === 'effort' || viewMode === 'both') && (
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Effort (MM)', angle: -90, position: 'insideLeft' }}
              />
            )}
            {(viewMode === 'progress' || viewMode === 'both') && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Progress (%)', angle: 90, position: 'insideRight' }}
                domain={[0, targetProgress]}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {(viewMode === 'effort' || viewMode === 'both') && (
              <>
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="planned"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.3}
                  name="Planned Effort"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="actual"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.5}
                  name="Actual Effort"
                />
              </>
            )}
            {(viewMode === 'progress' || viewMode === 'both') && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="progress"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                name="Progress %"
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis 
              dataKey="week" 
              tick={{ fill: '#475569', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            {(viewMode === 'effort' || viewMode === 'both') && (
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Effort (MM)', angle: -90, position: 'insideLeft' }}
              />
            )}
            {(viewMode === 'progress' || viewMode === 'both') && viewMode !== 'effort' && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Progress (%)', angle: 90, position: 'insideRight' }}
                domain={[0, targetProgress]}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {(viewMode === 'effort' || viewMode === 'both') && (
              <>
                <Bar yAxisId="left" dataKey="planned" fill="#94a3b8" name="Planned Effort" />
                <Bar yAxisId="left" dataKey="actual" fill="#0ea5e9" name="Actual Effort" />
                {showVariance && <Bar yAxisId="left" dataKey="variance" fill="#ef4444" name="Variance" />}
              </>
            )}
            {viewMode === 'progress' && (
              <Bar yAxisId="right" dataKey="progress" fill="#10b981" name="Progress %" />
            )}
          </BarChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis 
              dataKey="week" 
              tick={{ fill: '#475569', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            {(viewMode === 'effort' || viewMode === 'both') && (
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Effort (MM)', angle: -90, position: 'insideLeft' }}
              />
            )}
            {(viewMode === 'progress' || viewMode === 'both') && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Progress (%)', angle: 90, position: 'insideRight' }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {(viewMode === 'effort' || viewMode === 'both') && (
              <>
                <Bar yAxisId="left" dataKey="planned" fill="#94a3b8" name="Planned Effort" />
                <Bar yAxisId="left" dataKey="actual" fill="#0ea5e9" name="Actual Effort" />
              </>
            )}
            {(viewMode === 'progress' || viewMode === 'both') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="progress"
                stroke="#10b981"
                strokeWidth={3}
                name="Progress %"
                dot={{ r: 5, fill: '#10b981' }}
              />
            )}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Control Panel */}
      <div className="mb-4 space-y-3">
        {/* Top Row: Chart Type & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            {/* Chart Type */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
              <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                {(['line', 'area', 'bar', 'composed'] as ChartType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      chartType === type
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
              <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                {(['effort', 'progress', 'both'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      viewMode === mode
                        ? 'bg-green-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => handleExport('png')}>
              📥 PNG
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('svg')}>
              📥 SVG
            </Button>
          </div>
        </div>

        {/* Bottom Row: Options */}
        <div className="flex flex-wrap gap-2 px-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded"
            />
            Grid
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={(e) => setShowLegend(e.target.checked)}
              className="rounded"
            />
            Legend
          </label>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Planned" value={stats.totalPlanned} unit="MM" />
        <StatCard label="Total Actual" value={stats.totalActual} unit="MM" />
        <StatCard label="Avg Progress" value={stats.avgProgress} unit="%" />
        <StatCard 
          label="Variance" 
          value={stats.variance} 
          unit="MM"
          status={parseFloat(stats.variance) > 0 ? 'danger' : 'good'}
        />
        <StatCard 
          label="Status" 
          value={stats.status} 
          status={stats.status === 'Over' ? 'danger' : stats.status === 'Under' ? 'warning' : 'good'}
        />
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  status?: 'good' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, status }) => {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`p-3 rounded-lg border ${status ? statusColors[status] : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
      <div className="text-xs font-medium opacity-75 mb-1">{label}</div>
      <div className="text-lg font-bold">
        {value}{unit && <span className="text-sm ml-1">{unit}</span>}
      </div>
    </div>
  );
};
