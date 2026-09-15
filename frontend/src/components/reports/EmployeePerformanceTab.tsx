import React, { useState, useEffect } from 'react';
import { User, Award, CheckCircle2, AlertCircle, Clock, BarChart3 } from 'lucide-react';
import { reportsApi } from '../../services/api';

export const EmployeePerformanceTab: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    reportsApi
      .getEmployeePerformance()
      .then((res) => {
        const records = Array.isArray(res.data) ? res.data : [];
        setEmployees(records);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Staff Task Completion & Performance Scorecard
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Metrics tracking on-time delivery, active workload, and completed hours
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No employee performance data available.
          </div>
        )}

        {employees.map((emp) => {
          const totalAssigned = emp.TotalAssigned || 0;
          const completed = emp.CompletedTasks || emp.Completed || 0;
          const overdue = emp.OverdueTasks || emp.Overdue || 0;
          const rate = emp.CompletionRatePercentage !== undefined
            ? parseFloat(emp.CompletionRatePercentage)
            : totalAssigned > 0
            ? Math.round((completed / totalAssigned) * 100)
            : 0;

          return (
            <div
              key={emp.EmployeeID}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {emp.EmployeeName ? emp.EmployeeName.substring(0, 2).toUpperCase() : 'EM'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {emp.EmployeeName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {emp.Designation || 'Staff'} • {emp.DepartmentName || 'General'}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{totalAssigned}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block">Completed</span>
                  <span className="text-base font-extrabold text-emerald-600">{completed}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-600 font-bold uppercase block">Overdue</span>
                  <span className="text-base font-extrabold text-rose-600">{overdue}</span>
                </div>
              </div>

              {/* Completion Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">Completion Rate</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{rate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
