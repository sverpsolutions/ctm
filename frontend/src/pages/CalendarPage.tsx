import React, { useState } from 'react';
import { CalendarView } from '../components/calendar/CalendarView';
import { CalendarEventItem } from '../types';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { DateDetailModal } from '../components/importantDates/DateDetailModal';

export const CalendarPage: React.FC = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedDateId, setSelectedDateId] = useState<number | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const handleEventClick = (event: CalendarEventItem) => {
    if (event.type === 'task') {
      setSelectedTaskId(event.referenceId);
      setIsTaskModalOpen(true);
    } else if (event.type === 'date') {
      setSelectedDateId(event.referenceId);
      setIsDateModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Unified Company Schedule & Events Calendar
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Consolidated visual calendar tracking tasks, contracts, compliance deadlines, birthdays, and anniversaries
        </p>
      </div>

      <CalendarView onEventClick={handleEventClick} />

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTaskId(null);
          }}
          onTaskUpdated={() => {}}
        />
      )}

      {selectedDateId && (
        <DateDetailModal
          dateId={selectedDateId}
          isOpen={isDateModalOpen}
          onClose={() => {
            setIsDateModalOpen(false);
            setSelectedDateId(null);
          }}
          onOpenRenewal={() => {}}
        />
      )}
    </div>
  );
};
