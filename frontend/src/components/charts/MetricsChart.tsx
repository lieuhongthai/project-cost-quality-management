import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface MetricsChartProps {
  spi: number;
  cpi: number;
  delayRate?: number;
  tcpi?: number;
  progress?: number;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  spi,
  cpi,
  delayRate = 0,
  tcpi,
  progress,
}) => {
  // Normalize all metrics to a 0-120 scale where 100 = target met
  // SPI target: 1.0 (≥0.95 is good)
  // CPI target: 1.0 (≥0.95 is good)
  // On-Time Rate: 100% (≥95% is good), derived from delayRate
  // TCPI: 1.0 means remaining work matches remaining budget
  // Progress: direct percentage

  const onTimeRate = 100 - (delayRate || 0);

  const data: Array<{ metric: string; value: number; target: number; fullMark: number }> = [
    {
      metric: 'SPI',
      value: Math.min(spi * 100, 120),
      target: 100,
      fullMark: 120,
    },
    {
      metric: 'CPI',
      value: Math.min(cpi * 100, 120),
      target: 100,
      fullMark: 120,
    },
    {
      metric: 'On-Time',
      value: Math.min(onTimeRate, 120),
      target: 95,
      fullMark: 120,
    },
  ];

  if (tcpi !== undefined) {
    data.push({
      metric: 'TCPI',
      value: Math.min(tcpi * 100, 120),
      target: 100,
      fullMark: 120,
    });
  }

  if (progress !== undefined) {
    data.push({
      metric: 'Progress',
      value: Math.min(progress, 120),
      target: 100,
      fullMark: 120,
    });
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid gridType="polygon" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 120]}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickCount={4}
        />
        <Radar
          name="Target"
          dataKey="target"
          stroke="#d1d5db"
          fill="#d1d5db"
          fillOpacity={0.15}
          strokeDasharray="4 4"
        />
        <Radar
          name="Actual"
          dataKey="value"
          stroke="#0ea5e9"
          fill="#0ea5e9"
          fillOpacity={0.3}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'Target') return [`${value}%`, name];
            return [`${value.toFixed(1)}%`, name];
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
