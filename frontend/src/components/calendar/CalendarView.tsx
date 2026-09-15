import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  Cake,
  Award,
  Filter,
} from 'lucide-react';
import { CalendarEventItem } from '../../types';
import { calendarApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface CalendarViewProps {
  onEventClick: (event: CalendarEventItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onEventClick }) => {
  const { activeCompanyId } = useTenant();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const start = new Date(year, month, 1).toISOString().substring(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().substring(0, 10);

      const res = await calendarApi.getEvents({
        start,
        end,
        type: eventTypeFilter,
      });
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, eventTypeFilter, activeCompanyId]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid calculations
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 space-y-6">
      {/* Calendar Top Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher & Event Type Filter */}
        <div className="flex items-center gap-2.5">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none font-medium"
          >
            <option value="all">All Events & Tasks</option>
            <option value="tasks">Tasks Only</option>
            <option value="dates">Important Dates Only</option>
            <option value="events">Birthdays & Anniversaries</option>
          </select>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md transition ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-md transition ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Agenda View
            </button>
          </div>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' ? (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center text-xs font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 py-2.5 border-b border-slate-200/80 dark:border-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
            {blankDays.map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[100px] sm:min-h-[120px] bg-slate-50/30 dark:bg-slate-900/30 p-1.5"></div>
            ))}

            {daysArray.map((day) => {
              const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => {
                const eventDate = e.start.substring(0, 10);
                return eventDate === dayString;
              });

              const isToday = dayString === new Date().toISOString().substring(0, 10);

              return (
                <div
                  key={day}
                  className={`min-h-[100px] sm:min-h-[120px] p-1.5 transition overflow-y-auto max-h-36 ${
                    isToday
                      ? 'bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition shadow-none hover:shadow-sm"
                        style={{
                          backgroundColor: `${event.color}20`,
                          color: event.color,
                          borderLeft: `2.5px solid ${event.color}`,
                        }}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] font-semibold text-slate-400 px-1 block">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda View List */
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No events scheduled for this month.
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: `${event.color}20`, color: event.color }}
                  >
                    {event.type === 'task' ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : event.type === 'birthday' ? (
                      <Cake className="w-5 h-5" />
                    ) : event.type === 'anniversary' ? (
                      <Award className="w-5 h-5" />
                    ) : (
                      <CalendarIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {event.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {event.department && `${event.department} • `}
                      {event.category || event.type}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {new Date(event.start).toLocaleDateString()}
                  </span>
                  {event.priority && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Priority: {event.priority}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
