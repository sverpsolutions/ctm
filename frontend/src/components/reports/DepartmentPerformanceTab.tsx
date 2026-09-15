import React, { useState, useEffect } from 'react';
import { Building, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { reportsApi } from '../../services/api';

export const DepartmentPerformanceTab: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    reportsApi
      .getDepartmentPerformance()
      .then((res) => {
        const records = Array.isArray(res.data) ? res.data : [];
        setDepartments(records);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Department Workload & Delivery Metrics
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Comparative analysis across operational and business departments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No department performance records found.
          </div>
        )}

        {departments.map((dept) => {
          const totalTasks = dept.TotalTasks || dept.Total || 0;
          const completedTasks = dept.CompletedTasks || dept.Completed || 0;
          const overdueTasks = dept.OverdueTasks || dept.Overdue || 0;
          const rate = dept.CompletionRatePercentage !== undefined
            ? parseFloat(dept.CompletionRatePercentage)
            : totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;

          return (
            <div
              key={dept.DepartmentID}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {dept.DepartmentName}
                    </h4>
                    <span className="text-[11px] text-slate-400">{dept.DepartmentCode} • Head: {dept.DepartmentHead || 'Unassigned'}</span>
                  </div>
                </div>

                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {rate}% Complete
                </span>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{totalTasks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block">Done</span>
                  <span className="text-base font-extrabold text-emerald-600">{completedTasks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-600 font-bold uppercase block">Overdue</span>
                  <span className="text-base font-extrabold text-rose-600">{overdueTasks}</span>
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
