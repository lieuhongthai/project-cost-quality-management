import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface MetricsChartProps {
  spi: number;
  cpi: number;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ spi, cpi }) => {
  const data = [
    {
      metric: 'SPI',
      value: Math.min(spi * 100, 150),
      fullMark: 150,
    },
    {
      metric: 'CPI',
      value: Math.min(cpi * 100, 150),
      fullMark: 150,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <PolarRadiusAxis />
        <Radar
          name="Performance"
          dataKey="value"
          stroke="#0ea5e9"
          fill="#0ea5e9"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
