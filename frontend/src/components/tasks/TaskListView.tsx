import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Building,
  CheckSquare,
  ArrowUpDown,
  MoreVertical,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import { TaskItem, Department } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';
import { exportDataToExcel, exportDataToPdf } from '../../utils/exportUtils';

interface TaskListViewProps {
  tasks: TaskItem[];
  departments: Department[];
  pagination: { page: number; totalPages: number; total: number; limit: number };
  onPageChange: (page: number) => void;
  onTaskClick: (taskId: number) => void;
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  onSort: (column: string) => void;
  onDeleteTask: (taskId: number) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  departments,
  pagination,
  onPageChange,
  onTaskClick,
  selectedIds,
  setSelectedIds,
  sortBy,
  sortOrder,
  onSort,
  onDeleteTask,
}) => {
  const isAllSelected = tasks.length > 0 && tasks.every((t) => selectedIds.includes(t.TaskID));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map((t) => t.TaskID));
    }
  };

  const handleToggleRow = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedIds(
      selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]
    );
  };

  // Export to Excel (XLSX)
  const exportToExcel = async () => {
    const dataToExport = tasks.map((t) => ({
      'Task No': t.TaskNumber,
      'Title': t.TaskTitle,
      'Status': t.EffectiveStatus,
      'Priority': t.Priority,
      'Department': t.DepartmentName || 'General',
      'Assignees': t.AssigneeNames || 'None',
      'Due Date': new Date(t.DueDate).toLocaleDateString(),
      'Progress %': `${t.PercentageComplete || 0}%`,
      'Est Hours': t.EstimatedHours,
      'Actual Hours': t.ActualHours,
    }));

    await exportDataToExcel(dataToExport, 'Tasks', `ApexCorp_Tasks_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Export to PDF
  const exportToPdf = async () => {
    const headers = ['Task No', 'Title', 'Department', 'Priority', 'Status', 'Due Date', 'Assignee', 'Progress'];
    const tableRows = tasks.map((t) => [
      t.TaskNumber,
      t.TaskTitle,
      t.DepartmentName || 'General',
      t.Priority,
      t.EffectiveStatus,
      new Date(t.DueDate).toLocaleDateString(),
      t.AssigneeNames || '-',
      `${t.PercentageComplete || 0}%`,
    ]);

    await exportDataToPdf(
      'Apex Global Solutions — Task Management Report',
      headers,
      tableRows,
      `ApexCorp_Tasks_${new Date().toISOString().substring(0, 10)}.pdf`,
      [79, 70, 229]
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Top action bar: Export Buttons */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-xs font-semibold text-slate-500">
          Total: <span className="text-slate-800 dark:text-slate-200 font-bold">{pagination.total}</span> Tasks
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}>
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPdf} icon={<FileText className="w-3.5 h-3.5 text-rose-600" />}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold select-none">
              <th className="py-3.5 pl-6 pr-3 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-indigo-600" onClick={() => onSort('TaskNumber')}>
                <div className="flex items-center gap-1">
                  Task No <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-indigo-600" onClick={() => onSort('TaskTitle')}>
                <div className="flex items-center gap-1">
                  Title <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-indigo-600" onClick={() => onSort('DepartmentName')}>
                <div className="flex items-center gap-1">
                  Department <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3">Assignees</th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-indigo-600" onClick={() => onSort('Priority')}>
                <div className="flex items-center gap-1">
                  Priority <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-indigo-600" onClick={() => onSort('Status')}>
                <div className="flex items-center gap-1">
                  Status <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-indigo-600" onClick={() => onSort('DueDate')}>
                <div className="flex items-center gap-1">
                  Due Date <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:text-indigo-600" onClick={() => onSort('PercentageComplete')}>
                <div className="flex items-center gap-1">
                  Progress <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  No tasks matching the selected filters.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isSelected = selectedIds.includes(task.TaskID);
                const isOverdue = task.EffectiveStatus === 'Overdue';

                return (
                  <tr
                    key={task.TaskID}
                    onClick={() => onTaskClick(task.TaskID)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 pl-6 pr-3" onClick={(e) => handleToggleRow(e, task.TaskID)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {task.TaskNumber}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 max-w-xs sm:max-w-sm">
                        {task.TaskTitle}
                      </div>
                      {task.RelatedDateTitle && (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5">
                          📌 {task.RelatedDateTitle}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      {task.DepartmentName || 'General'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]">
                      {task.AssigneeNames || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          task.Priority === 'Critical'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : task.Priority === 'High'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {task.Priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Badge
                        variant={
                          task.EffectiveStatus === 'Completed'
                            ? 'success'
                            : task.EffectiveStatus === 'Overdue'
                            ? 'danger'
                            : task.EffectiveStatus === 'Waiting for Approval'
                            ? 'warning'
                            : 'primary'
                        }
                      >
                        {task.EffectiveStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className={`font-semibold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {new Date(task.DueDate).toLocaleDateString()}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {task.DaysRemaining !== undefined ? (task.DaysRemaining < 0 ? `${Math.abs(task.DaysRemaining)}d late` : `${task.DaysRemaining}d left`) : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${task.PercentageComplete || 0}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[11px] text-slate-600 dark:text-slate-300">
                          {task.PercentageComplete || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-6 pl-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onTaskClick(task.TaskID)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.TaskID)}
                          title="Delete Task"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.total}
        pageSize={pagination.limit}
        onPageChange={onPageChange}
      />
    </div>
  );
};
