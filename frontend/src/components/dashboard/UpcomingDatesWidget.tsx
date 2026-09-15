import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { ImportantDateItem } from '../../types';
import { useNavigate } from 'react-router-dom';

interface UpcomingDatesWidgetProps {
  dates: ImportantDateItem[];
}

export const UpcomingDatesWidget: React.FC<UpcomingDatesWidgetProps> = ({ dates }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-2.5">
      {dates.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          No upcoming important dates in the next 30 days.
        </div>
      ) : (
        dates.map((item) => {
          const daysLeft = item.DaysRemaining ?? 0;
          const isToday = daysLeft === 0;
          const isCritical = daysLeft >= 0 && daysLeft <= 3;
          const isUrgent = daysLeft >= 4 && daysLeft <= 7;

          return (
            <div
              key={item.ImportantDateID}
              onClick={() => navigate(`/important-dates?highlight=${item.ImportantDateID}`)}
              className="group p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between gap-3 shadow-none hover:shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm"
                  style={{
                    backgroundColor: `${item.CategoryColor || '#6366f1'}15`,
                    color: item.CategoryColor || '#6366f1',
                  }}
                >
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {item.Title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.CategoryName} • {new Date(item.ExpiryDate || item.Date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    isToday
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse'
                      : isCritical
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : isUrgent
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {isToday ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days left`}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
