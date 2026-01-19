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
  ReferenceLine,
  Cell,
} from 'recharts';

interface PhaseEfficiencyChartProps {
  data: Array<{
    name: string;
    estimated: number;
    actual: number;
    progress: number;
  }>;
  effortLabel?: string;
}

export const PhaseEfficiencyChart: React.FC<PhaseEfficiencyChartProps> = ({
  data,
  effortLabel = 'Hours'
}) => {
  // Calculate efficiency for each item
  const chartData = data.map(item => {
    const expectedEffort = item.estimated * (item.progress / 100);
    const efficiency = expectedEffort > 0
      ? Math.round((expectedEffort / item.actual) * 100)
      : item.actual > 0 ? 0 : 100;

    return {
      ...item,
      expectedEffort,
      efficiency,
    };
  });

  // Sort by efficiency (lowest first to highlight problems)
  const sortedData = [...chartData].sort((a, b) => a.efficiency - b.efficiency);

  // Limit to top 10 items for readability
  const displayData = sortedData.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={displayData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'Dự kiến') return [`${value.toFixed(1)} ${effortLabel}`, name];
            if (name === 'Thực tế') return [`${value.toFixed(1)} ${effortLabel}`, name];
            return [value, name];
          }}
        />
        <Legend />
        <ReferenceLine x={0} stroke="#666" />
        <Bar
          dataKey="expectedEffort"
          fill="#94a3b8"
          name="Dự kiến"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="actual"
          name="Thực tế"
          radius={[0, 4, 4, 0]}
        >
          {displayData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.efficiency >= 100 ? '#22c55e' : entry.efficiency >= 83 ? '#f59e0b' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
