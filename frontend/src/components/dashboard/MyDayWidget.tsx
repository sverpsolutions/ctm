import React from 'react';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MyDayWidgetProps {
  tasks: any[];
  onOpenTask: (taskId: number) => void;
}

export const MyDayWidget: React.FC<MyDayWidgetProps> = ({ tasks, onOpenTask }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          No tasks scheduled for today. Enjoy your day or pick a task from the list!
        </div>
      ) : (
        tasks.map((task) => (
          <div
            key={task.TaskID}
            onClick={() => onOpenTask(task.TaskID)}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer shadow-sm flex flex-col gap-2 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  {task.TaskNumber}
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                  {task.TaskTitle}
                </h4>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  task.Status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : task.Status === 'In Progress'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {task.Status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${task.PercentageComplete || 0}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {task.PercentageComplete || 0}%
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
