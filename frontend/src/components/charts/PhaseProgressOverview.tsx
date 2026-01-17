import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface PhaseProgressOverviewProps {
  data: Array<{
    name: string;
    progress: number;
    status: string;
  }>;
}

const getProgressColor = (progress: number, status: string) => {
  if (status === 'Completed') return '#22c55e';
  if (status === 'Skipped') return '#f59e0b';
  if (progress === 0) return '#e5e7eb';
  if (progress >= 80) return '#86efac';
  if (progress >= 50) return '#93c5fd';
  return '#fde68a';
};

export const PhaseProgressOverview: React.FC<PhaseProgressOverviewProps> = ({ data }) => {
  // Sort by progress
  const sortedData = [...data].sort((a, b) => b.progress - a.progress);

  // Limit to 15 items
  const displayData = sortedData.slice(0, 15);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        Chưa có dữ liệu Screen/Function
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, displayData.length * 35)}>
      <BarChart
        data={displayData}
        layout="vertical"
        margin={{ top: 5, right: 50, left: 120, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, 'Tiến độ']}
        />
        <Bar
          dataKey="progress"
          radius={[0, 4, 4, 0]}
          background={{ fill: '#f3f4f6', radius: [0, 4, 4, 0] }}
        >
          {displayData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getProgressColor(entry.progress, entry.status)}
            />
          ))}
          <LabelList
            dataKey="progress"
            position="right"
            formatter={(value: number) => `${value}%`}
            style={{ fontSize: 11, fill: '#6b7280' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
