import React, { useState } from 'react';
import { TaskItem } from '../../types';
import { Calendar, CheckSquare, Clock, AlertTriangle, User, Paperclip } from 'lucide-react';
import { Badge } from '../common/Badge';

interface KanbanBoardProps {
  tasks: TaskItem[];
  onTaskClick: (taskId: number) => void;
  onStatusChange: (taskId: number, newStatus: string) => void;
}

const COLUMNS = [
  { id: 'New', title: 'New', color: 'border-t-indigo-500' },
  { id: 'In Progress', title: 'In Progress', color: 'border-t-blue-500' },
  { id: 'Waiting for Approval', title: 'Waiting Approval', color: 'border-t-cyan-500' },
  { id: 'On Hold', title: 'On Hold', color: 'border-t-amber-500' },
  { id: 'Overdue', title: 'Overdue', color: 'border-t-rose-500' },
  { id: 'Completed', title: 'Completed', color: 'border-t-emerald-500' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id));
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    const taskId = parseInt(taskIdStr, 10);
    if (taskId && status) {
      onStatusChange(taskId, status);
    }
    setDraggedTaskId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 select-none no-scrollbar">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.EffectiveStatus === col.id);

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="w-72 sm:w-80 flex-shrink-0 bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col max-h-[calc(100vh-14rem)]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {col.title}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
              {colTasks.map((task) => {
                const isOverdue = task.EffectiveStatus === 'Overdue';
                const daysLeft = task.DaysRemaining ?? 0;

                return (
                  <div
                    key={task.TaskID}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.TaskID)}
                    onClick={() => onTaskClick(task.TaskID)}
                    className="p-3.5 bg-white dark:bg-slate-850 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer space-y-2.5 active:scale-[0.98] group"
                  >
                    {/* Header: Number & Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                        {task.TaskNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          task.Priority === 'Critical'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : task.Priority === 'High'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {task.Priority}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-2 leading-snug">
                      {task.TaskTitle}
                    </h4>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Progress</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {task.PercentageComplete || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${task.PercentageComplete || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer: Date & Assignees */}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800/80 text-slate-400">
                      <div
                        className={`flex items-center gap-1 font-semibold ${
                          isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.DueDate).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{task.AssigneeNames || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
