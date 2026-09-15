import React from 'react';
import { CheckSquare, Trash2, ArrowUpRight, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onDelete: () => void;
  onExport: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClear,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onExport,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 border border-slate-700 animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700 text-xs font-semibold">
        <CheckSquare className="w-4 h-4 text-indigo-400" />
        <span>{selectedCount} Selected</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Status Dropdown */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              onStatusChange(e.target.value);
              e.target.value = '';
            }
          }}
          className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 outline-none hover:bg-slate-700 cursor-pointer"
        >
          <option value="">Update Status...</option>
          <option value="New">Set: New</option>
          <option value="In Progress">Set: In Progress</option>
          <option value="On Hold">Set: On Hold</option>
          <option value="Waiting for Approval">Set: Waiting Approval</option>
          <option value="Completed">Set: Completed</option>
          <option value="Cancelled">Set: Cancelled</option>
        </select>

        {/* Priority Dropdown */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              onPriorityChange(e.target.value);
              e.target.value = '';
            }
          }}
          className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 outline-none hover:bg-slate-700 cursor-pointer"
        >
          <option value="">Update Priority...</option>
          <option value="Low">Priority: Low</option>
          <option value="Medium">Priority: Medium</option>
          <option value="High">Priority: High</option>
          <option value="Critical">Priority: Critical</option>
        </select>

        <Button variant="danger" size="sm" onClick={onDelete} icon={<Trash2 className="w-3.5 h-3.5" />}>
          Delete
        </Button>

        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 transition"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
};
