import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TestingQualityChartProps {
  data: Array<{
    week: string;
    passed: number;
    failed: number;
    passRate: number;
  }>;
}

export const TestingQualityChart: React.FC<TestingQualityChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="passed" fill="#10b981" name="Passed" />
        <Bar dataKey="failed" fill="#ef4444" name="Failed" />
      </BarChart>
    </ResponsiveContainer>
  );
};
