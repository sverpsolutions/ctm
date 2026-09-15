import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  CheckSquare,
  Clock,
  AlertCircle,
  BarChart,
} from 'lucide-react';
import { reportsApi, mastersApi } from '../../services/api';
import { Department } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { exportDataToExcel, exportDataToPdf } from '../../utils/exportUtils';

export const TaskReportsTab: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    TotalCount: 0,
    CompletedCount: 0,
    OverdueCount: 0,
    PendingCount: 0,
    CriticalCount: 0,
    TotalEstimatedHours: 0,
    TotalActualHours: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const res = await reportsApi.getTaskReports({
        status: status || undefined,
        priority: priority || undefined,
        departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      const records = Array.isArray(res.data) ? res.data : res.data?.records || [];
      const sum = res.data?.summary || res.summary || {};
      setTasks(records);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load task reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    mastersApi.getDepartments().then((res) => setDepartments(res.data || []));
    fetchReports();
  }, []);

  const handleExportExcel = async () => {
    const data = tasks.map((t) => ({
      'Task Number': t.TaskNumber,
      'Title': t.TaskTitle,
      'Department': t.DepartmentName || 'General',
      'Priority': t.Priority,
      'Status': t.EffectiveStatus || t.Status,
      'Progress %': `${t.PercentageComplete || 0}%`,
      'Due Date': t.DueDate ? new Date(t.DueDate).toLocaleDateString() : '-',
      'Assignee': t.Assignees || '-',
    }));

    await exportDataToExcel(data, 'TaskReports', `ApexCorp_Task_Report_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const handleExportPdf = async () => {
    const headers = ['Task No', 'Title', 'Department', 'Priority', 'Status', 'Progress', 'Due Date', 'Assignee'];
    const rows = tasks.map((t) => [
      t.TaskNumber,
      t.TaskTitle,
      t.DepartmentName || 'General',
      t.Priority,
      t.EffectiveStatus || t.Status,
      `${t.PercentageComplete || 0}%`,
      t.DueDate ? new Date(t.DueDate).toLocaleDateString() : '-',
      t.Assignees || '-',
    ]);

    await exportDataToPdf(
      'Apex Global Solutions — Task Performance & Audit Report',
      headers,
      rows,
      `ApexCorp_Task_Report_${new Date().toISOString().substring(0, 10)}.pdf`,
      [79, 70, 229]
    );
  };

  const total = summary.TotalCount || tasks.length || 0;
  const completed = summary.CompletedCount || 0;
  const overdue = summary.OverdueCount || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <span className="text-xs text-slate-400 font-semibold uppercase">Total Filtered</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{total}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <span className="text-xs text-emerald-600 font-semibold uppercase">Completed</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{completed}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <span className="text-xs text-rose-600 font-semibold uppercase">Overdue</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{overdue}</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <span className="text-xs text-indigo-600 font-semibold uppercase">Completion Rate</span>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{completionRate}%</div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Approval">Waiting Approval</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
          </Select>

          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>

          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.DepartmentID} value={d.DepartmentID}>
                {d.DepartmentName}
              </option>
            ))}
          </Select>

          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="From Date" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="To Date" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="primary" size="sm" onClick={fetchReports} isLoading={isLoading}>
            Apply Filters
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}>
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} icon={<FileText className="w-3.5 h-3.5 text-rose-600" />}>
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Task No</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Assignees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No task records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.TaskID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-extrabold text-indigo-600 dark:text-indigo-400">{t.TaskNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">{t.TaskTitle}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{t.DepartmentName || 'General'}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t.Priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={(t.EffectiveStatus || t.Status) === 'Completed' ? 'success' : (t.EffectiveStatus || t.Status) === 'Overdue' ? 'danger' : 'primary'}>
                        {t.EffectiveStatus || t.Status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{t.PercentageComplete || 0}%</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {t.DueDate ? new Date(t.DueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{t.Assignees || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
