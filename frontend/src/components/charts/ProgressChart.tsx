import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ProgressChartProps {
  data: Array<{
    week: string;
    planned: number;
    actual: number;
    progress: number;
  }>;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis yAxisId="left" label={{ value: 'Effort (MM)', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: 'Progress (%)', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="planned"
          stroke="#94a3b8"
          name="Planned Effort"
          strokeDasharray="5 5"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="actual"
          stroke="#0ea5e9"
          name="Actual Effort"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="progress"
          stroke="#10b981"
          name="Progress %"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
