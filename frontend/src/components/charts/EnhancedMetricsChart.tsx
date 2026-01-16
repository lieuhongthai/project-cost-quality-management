import React, { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Button } from '../common/Button';

type ChartType = 'radar' | 'line' | 'bar' | 'area';

interface MetricsData {
  spi: number;
  cpi: number;
  passRate: number;
  defectRate?: number;
  velocity?: number;
}

interface EnhancedMetricsChartProps {
  data: MetricsData;
  historicalData?: Array<MetricsData & { period: string }>;
  showComparison?: boolean;
  comparisonData?: MetricsData;
  comparisonLabel?: string;
  height?: number;
  onExport?: (type: 'png' | 'svg') => void;
}

// Custom Tooltip Component
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-300">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Evaluate status color
const getStatusColor = (value: number, metric: string): string => {
  if (metric === 'SPI' || metric === 'CPI') {
    if (value >= 0.95) return '#10b981'; // green
    if (value >= 0.85) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }
  if (metric === 'Quality') {
    if (value >= 95) return '#10b981';
    if (value >= 80) return '#f59e0b';
    return '#ef4444';
  }
  return '#0ea5e9'; // default blue
};

export const EnhancedMetricsChart: React.FC<EnhancedMetricsChartProps> = ({
  data,
  historicalData,
  showComparison = false,
  comparisonData,
  comparisonLabel = 'Comparison',
  height = 400,
  onExport,
}) => {
  const [chartType, setChartType] = useState<ChartType>('radar');
  const [showTrend, setShowTrend] = useState(false);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const baseMetrics = [
      {
        metric: 'SPI',
        current: Math.min(data.spi * 100, 150),
        fullMark: 150,
        comparison: comparisonData ? Math.min(comparisonData.spi * 100, 150) : undefined,
      },
      {
        metric: 'CPI',
        current: Math.min(data.cpi * 100, 150),
        fullMark: 150,
        comparison: comparisonData ? Math.min(comparisonData.cpi * 100, 150) : undefined,
      },
      {
        metric: 'Quality',
        current: data.passRate,
        fullMark: 100,
        comparison: comparisonData ? comparisonData.passRate : undefined,
      },
    ];

    if (data.defectRate !== undefined) {
      baseMetrics.push({
        metric: 'Defect Rate',
        current: Math.max(0, 100 - data.defectRate * 100),
        fullMark: 100,
        comparison: comparisonData?.defectRate 
          ? Math.max(0, 100 - comparisonData.defectRate * 100) 
          : undefined,
      });
    }

    if (data.velocity !== undefined) {
      baseMetrics.push({
        metric: 'Velocity',
        current: Math.min(data.velocity, 150),
        fullMark: 150,
        comparison: comparisonData?.velocity 
          ? Math.min(comparisonData.velocity, 150) 
          : undefined,
      });
    }

    return baseMetrics;
  }, [data, comparisonData]);

  // Prepare line/bar/area chart data (for historical view)
  const timeSeriesData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [
        {
          period: 'Current',
          SPI: data.spi * 100,
          CPI: data.cpi * 100,
          Quality: data.passRate,
        },
      ];
    }

    return historicalData.map((item) => ({
      period: item.period,
      SPI: item.spi * 100,
      CPI: item.cpi * 100,
      Quality: item.passRate,
      DefectRate: item.defectRate ? item.defectRate * 100 : undefined,
      Velocity: item.velocity,
    }));
  }, [data, historicalData]);

  // Export functionality
  const handleExport = (type: 'png' | 'svg') => {
    if (onExport) {
      onExport(type);
    } else {
      // Default export logic using html2canvas or similar
      console.log(`Exporting chart as ${type}`);
      // TODO: Implement actual export logic
    }
  };

  // Render chart based on type
  const renderChart = () => {
    switch (chartType) {
      case 'radar':
        return (
          <RadarChart data={radarData}>
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: '#475569', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 150]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <Radar
              name="Current"
              dataKey="current"
              stroke="#0ea5e9"
              fill="#0ea5e9"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            {showComparison && comparisonData && (
              <Radar
                name={comparisonLabel}
                dataKey="comparison"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
          </RadarChart>
        );

      case 'line':
        return (
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="period" 
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <YAxis 
              tick={{ fill: '#475569', fontSize: 11 }}
              label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="line" />
            <Line
              type="monotone"
              dataKey="SPI"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="CPI"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Quality"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="period" 
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <YAxis 
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="SPI" fill="#0ea5e9" />
            <Bar dataKey="CPI" fill="#10b981" />
            <Bar dataKey="Quality" fill="#f59e0b" />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="period" 
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <YAxis 
              tick={{ fill: '#475569', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="SPI"
              stroke="#0ea5e9"
              fill="#0ea5e9"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="CPI"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.4}
            />
            <Area
              type="monotone"
              dataKey="Quality"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Control Panel */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        {/* Chart Type Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Chart Type:
          </span>
          <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            {(['radar', 'line', 'bar', 'area'] as ChartType[]).map((type) => (
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          {historicalData && historicalData.length > 0 && (
            <button
              onClick={() => setShowTrend(!showTrend)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                showTrend
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {showTrend ? 'Hide' : 'Show'} Trend
            </button>
          )}
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('png')}
              className="text-xs"
            >
              📥 PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport('svg')}
              className="text-xs"
            >
              📥 SVG
            </Button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>

      {/* Metrics Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          label="SPI"
          value={data.spi}
          format="ratio"
          status={data.spi >= 0.95 ? 'good' : data.spi >= 0.85 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="CPI"
          value={data.cpi}
          format="ratio"
          status={data.cpi >= 0.95 ? 'good' : data.cpi >= 0.85 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="Pass Rate"
          value={data.passRate}
          format="percent"
          status={data.passRate >= 95 ? 'good' : data.passRate >= 80 ? 'warning' : 'danger'}
        />
        {data.defectRate !== undefined && (
          <MetricCard
            label="Defect Rate"
            value={data.defectRate}
            format="rate"
            status={data.defectRate <= 0.05 ? 'good' : data.defectRate <= 0.1 ? 'warning' : 'danger'}
          />
        )}
        {data.velocity !== undefined && (
          <MetricCard
            label="Velocity"
            value={data.velocity}
            format="number"
          />
        )}
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: number;
  format?: 'ratio' | 'percent' | 'rate' | 'number';
  status?: 'good' | 'warning' | 'danger';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  format = 'number',
  status 
}) => {
  const formatValue = () => {
    switch (format) {
      case 'ratio':
        return value.toFixed(2);
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'rate':
        return value.toFixed(3);
      case 'number':
        return value.toFixed(0);
      default:
        return value.toString();
    }
  };

  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`p-3 rounded-lg border ${status ? statusColors[status] : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
      <div className="text-xs font-medium opacity-75 mb-1">{label}</div>
      <div className="text-lg font-bold">{formatValue()}</div>
    </div>
  );
};
