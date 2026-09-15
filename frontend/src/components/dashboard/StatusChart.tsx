import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StatusChartProps {
  data: { StatusName: string; TaskCount: number }[];
  onSliceClick?: (status: string) => void;
}

export const StatusChart: React.FC<StatusChartProps> = ({ data, onSliceClick }) => {
  const statusColorMap: Record<string, string> = {
    New: '#6366f1',
    Pending: '#a855f7',
    'In Progress': '#3b82f6',
    'On Hold': '#f59e0b',
    'Waiting for Approval': '#06b6d4',
    Completed: '#10b981',
    Overdue: '#ef4444',
    Cancelled: '#64748b',
  };

  const labels = data.map((d) => d.StatusName);
  const counts = data.map((d) => d.TaskCount);
  const colors = labels.map((l) => statusColorMap[l] || '#94a3b8');

  const chartData = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 14,
          font: { size: 11, family: 'Plus Jakarta Sans' },
        },
      },
      tooltip: {
        padding: 10,
        cornerRadius: 8,
      },
    },
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0 && onSliceClick) {
        const index = elements[0].index;
        onSliceClick(labels[index]);
      }
    },
  };

  return (
    <div className="h-64 w-full relative">
      {counts.length === 0 || counts.every((c) => c === 0) ? (
        <div className="h-full flex items-center justify-center text-xs text-slate-400">
          No tasks recorded yet.
        </div>
      ) : (
        <Doughnut data={chartData} options={options} />
      )}
    </div>
  );
};
