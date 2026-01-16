import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
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

type ChartType = 'bar' | 'line' | 'area' | 'composed' | 'stacked';

interface TestingDataPoint {
  week: string;
  passed: number;
  failed: number;
  passRate: number;
  totalTests?: number;
  defects?: number;
  timePerTest?: number;
}

interface EnhancedTestingQualityChartProps {
  data: TestingDataPoint[];
  showDefects?: boolean;
  showPassRate?: boolean;
  showTrendLine?: boolean;
  targetPassRate?: number;
  height?: number;
  onExport?: (type: 'png' | 'svg') => void;
}

// Custom Tooltip
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const totalTests = payload.find(p => p.name === 'Passed')?.value as number + 
                     (payload.find(p => p.name === 'Failed')?.value as number || 0);
  const passRate = payload.find(p => p.name === 'Pass Rate')?.value;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[200px]">
      <p className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{label}</p>
      
      {totalTests && (
        <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Tests</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{totalTests}</div>
        </div>
      )}

      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {entry.name === 'Pass Rate' 
                ? `${Number(entry.value).toFixed(1)}%`
                : entry.value}
            </span>
          </div>
        ))}
      </div>

      {passRate !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded font-medium ${
              Number(passRate) >= 95 ? 'bg-green-100 text-green-700' :
              Number(passRate) >= 80 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {Number(passRate) >= 95 ? '✅ Good' :
               Number(passRate) >= 80 ? '⚠️ Acceptable' :
               '❌ Poor'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const EnhancedTestingQualityChart: React.FC<EnhancedTestingQualityChartProps> = ({
  data,
  showDefects = false,
  showPassRate = true,
  showTrendLine = false,
  targetPassRate = 95,
  height = 400,
  onExport,
}) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [highlightFailed, setHighlightFailed] = useState(false);

  // Calculate enhanced data with totals
  const enhancedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      totalTests: point.passed + point.failed,
    }));
  }, [data]);

  // Calculate trend line for pass rate
  const trendLineData = useMemo(() => {
    if (!showTrendLine || data.length < 2) return null;

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, point) => sum + point.passRate, 0);
    const sumXY = data.reduce((sum, point, i) => sum + i * point.passRate, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((point, i) => ({
      week: point.week,
      trend: Math.max(0, Math.min(100, slope * i + intercept)),
    }));
  }, [data, showTrendLine]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPassed = data.reduce((sum, p) => sum + p.passed, 0);
    const totalFailed = data.reduce((sum, p) => sum + p.failed, 0);
    const totalTests = totalPassed + totalFailed;
    const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    const avgPassRate = data.reduce((sum, p) => sum + p.passRate, 0) / data.length;
    const totalDefects = data.reduce((sum, p) => sum + (p.defects || 0), 0);
    const defectRate = totalTests > 0 ? totalDefects / totalTests : 0;

    return {
      totalTests,
      totalPassed,
      totalFailed,
      overallPassRate: overallPassRate.toFixed(1),
      avgPassRate: avgPassRate.toFixed(1),
      totalDefects,
      defectRate: (defectRate * 100).toFixed(2),
      status: overallPassRate >= 95 ? 'Good' : overallPassRate >= 80 ? 'Acceptable' : 'Poor',
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

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: enhancedData,
    };

    switch (chartType) {
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
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#475569', fontSize: 11 }}
              label={{ value: 'Test Cases', angle: -90, position: 'insideLeft' }}
            />
            {showPassRate && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#475569', fontSize: 11 }}
                label={{ value: 'Pass Rate (%)', angle: 90, position: 'insideRight' }}
                domain={[0, 100]}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {targetPassRate && showPassRate && (
              <ReferenceLine 
                yAxisId="right"
                y={targetPassRate} 
                stroke="#10b981" 
                strokeDasharray="3 3"
                label={{ value: 'Target', position: 'right', fill: '#10b981', fontSize: 11 }}
              />
            )}
            <Bar 
              yAxisId="left"
              dataKey="passed" 
              fill="#10b981" 
              name="Passed"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="left"
              dataKey="failed" 
              fill={highlightFailed ? "#dc2626" : "#ef4444"}
              name="Failed"
              radius={[4, 4, 0, 0]}
            />
            {showDefects && (
              <Bar 
                yAxisId="left"
                dataKey="defects" 
                fill="#f97316" 
                name="Defects"
                radius={[4, 4, 0, 0]}
              />
            )}
            {showPassRate && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="passRate"
                stroke="#0ea5e9"
                strokeWidth={3}
                name="Pass Rate"
                dot={{ r: 5, fill: '#0ea5e9' }}
                activeDot={{ r: 7 }}
              />
            )}
            {showTrendLine && trendLineData && (
              <Line
                yAxisId="right"
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
          </BarChart>
        );

      case 'stacked':
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
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Bar dataKey="passed" stackId="a" fill="#10b981" name="Passed" />
            <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
          </BarChart>
        );

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
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#475569', fontSize: 11 }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {targetPassRate && (
              <ReferenceLine 
                yAxisId="right"
                y={targetPassRate} 
                stroke="#10b981" 
                strokeDasharray="3 3"
              />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="passed"
              stroke="#10b981"
              strokeWidth={2}
              name="Passed"
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              name="Failed"
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="passRate"
              stroke="#0ea5e9"
              strokeWidth={3}
              name="Pass Rate"
              dot={{ r: 5 }}
            />
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
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey="passed"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
              name="Passed"
            />
            <Area
              type="monotone"
              dataKey="failed"
              stackId="1"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.6}
              name="Failed"
            />
          </AreaChart>
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
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#475569', fontSize: 11 }}
              label={{ value: 'Test Cases', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#475569', fontSize: 11 }}
              label={{ value: 'Pass Rate (%)', angle: 90, position: 'insideRight' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {targetPassRate && (
              <ReferenceLine 
                yAxisId="right"
                y={targetPassRate} 
                stroke="#10b981" 
                strokeDasharray="3 3"
              />
            )}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="passed"
              fill="#10b981"
              fillOpacity={0.3}
              stroke="#10b981"
              name="Passed"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="failed"
              fill="#ef4444"
              fillOpacity={0.3}
              stroke="#ef4444"
              name="Failed"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="passRate"
              stroke="#0ea5e9"
              strokeWidth={3}
              name="Pass Rate"
              dot={{ r: 5, fill: '#0ea5e9' }}
            />
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
        {/* Top Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            {/* Chart Type */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
              <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                {(['bar', 'stacked', 'line', 'area', 'composed'] as ChartType[]).map((type) => (
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
          </div>

          {/* Export */}
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => handleExport('png')}>
              📥 PNG
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleExport('svg')}>
              📥 SVG
            </Button>
          </div>
        </div>

        {/* Bottom Row: Options */}
        <div className="flex flex-wrap gap-4 px-4">
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
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={highlightFailed}
              onChange={(e) => setHighlightFailed(e.target.checked)}
              className="rounded"
            />
            Highlight Failed
          </label>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart() || <></>}
      </ResponsiveContainer>

      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total Tests" value={stats.totalTests.toString()} />
        <StatCard label="Passed" value={stats.totalPassed.toString()} status="good" />
        <StatCard label="Failed" value={stats.totalFailed.toString()} status="danger" />
        <StatCard 
          label="Overall Pass Rate" 
          value={`${stats.overallPassRate}%`}
          status={
            parseFloat(stats.overallPassRate) >= 95 ? 'good' :
            parseFloat(stats.overallPassRate) >= 80 ? 'warning' : 'danger'
          }
        />
        <StatCard label="Avg Pass Rate" value={`${stats.avgPassRate}%`} />
        {showDefects && <StatCard label="Total Defects" value={stats.totalDefects.toString()} status="warning" />}
        {showDefects && <StatCard label="Defect Rate" value={`${stats.defectRate}%`} />}
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  status?: 'good' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, status }) => {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`p-3 rounded-lg border ${status ? statusColors[status] : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
      <div className="text-xs font-medium opacity-75 mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
};
