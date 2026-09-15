import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OverdueTasksWidgetProps {
  tasks: any[];
}

export const OverdueTasksWidget: React.FC<OverdueTasksWidgetProps> = ({ tasks }) => {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          🎉 No overdue tasks! All tasks are on schedule.
        </div>
      ) : (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <th className="pb-3 font-semibold">Task</th>
              <th className="pb-3 font-semibold">Assignee</th>
              <th className="pb-3 font-semibold">Department</th>
              <th className="pb-3 font-semibold text-right">Overdue By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map((task) => (
              <tr
                key={task.TaskID}
                onClick={() => navigate(`/tasks?highlight=${task.TaskID}`)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition group"
              >
                <td className="py-3 pr-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate max-w-[200px] sm:max-w-[280px]">
                    {task.TaskTitle}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {task.TaskNumber}
                  </span>
                </td>
                <td className="py-3 px-2 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px]">
                  {task.Assignees || 'Unassigned'}
                </td>
                <td className="py-3 px-2 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {task.DepartmentName || 'General'}
                </td>
                <td className="py-3 pl-2 text-right font-bold text-rose-600 dark:text-rose-400">
                  <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 text-[10px]">
                    <AlertCircle className="w-3 h-3" />
                    {task.DaysOverdue ? `${task.DaysOverdue}d late` : 'Overdue'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
