import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface PhaseStatusPieChartProps {
  data: {
    'Not Started': number;
    'In Progress': number;
    'Completed': number;
    'Skipped': number;
  };
}

const STATUS_COLORS = {
  'Not Started': '#9ca3af',
  'In Progress': '#3b82f6',
  'Completed': '#22c55e',
  'Skipped': '#f59e0b',
};

const STATUS_LABELS = {
  'Not Started': 'Chưa bắt đầu',
  'In Progress': 'Đang thực hiện',
  'Completed': 'Hoàn thành',
  'Skipped': 'Bỏ qua',
};

export const PhaseStatusPieChart: React.FC<PhaseStatusPieChartProps> = ({ data }) => {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([status, value]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
      value,
      status,
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-500">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value, 'Số lượng']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
