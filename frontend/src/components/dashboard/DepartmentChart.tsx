import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DepartmentChartProps {
  data: { DepartmentName: string; Total: number; Completed: number; Overdue: number; ActiveTasks: number }[];
  onBarClick?: (dept: string) => void;
}

export const DepartmentChart: React.FC<DepartmentChartProps> = ({ data, onBarClick }) => {
  const labels = data.map((d) => d.DepartmentName);
  const activeCounts = data.map((d) => d.ActiveTasks);
  const completedCounts = data.map((d) => d.Completed);
  const overdueCounts = data.map((d) => d.Overdue);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Active',
        data: activeCounts,
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
      {
        label: 'Completed',
        data: completedCounts,
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
      {
        label: 'Overdue',
        data: overdueCounts,
        backgroundColor: '#ef4444',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, family: 'Plus Jakarta Sans' } },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, font: { size: 10, family: 'Plus Jakarta Sans' } },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 10, font: { size: 11, family: 'Plus Jakarta Sans' } },
      },
    },
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0 && onBarClick) {
        const index = elements[0].index;
        onBarClick(labels[index]);
      }
    },
  };

  return (
    <div className="h-64 w-full">
      {labels.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-slate-400">
          No department data available.
        </div>
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
};
