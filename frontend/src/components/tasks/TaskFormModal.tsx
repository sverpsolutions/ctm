import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Department, Employee, TaskCategory, TaskTemplate } from '../../types';
import { tasksApi, mastersApi } from '../../services/api';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [priority, setPriority] = useState<string>('Medium');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<string>('4.0');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch dropdown masters
      Promise.all([
        mastersApi.getDepartments(),
        mastersApi.getEmployees(),
        tasksApi.getTemplates(),
      ]).then(([deptRes, empRes, tmplRes]) => {
        setDepartments(deptRes.data || []);
        setEmployees(empRes.data || []);
        setTemplates(tmplRes.data || []);
      });

      // Default due date: tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().substring(0, 10));
    }
  }, [isOpen]);

  const handleTemplateChange = (templateIdStr: string) => {
    setSelectedTemplateId(templateIdStr);
    if (!templateIdStr) return;
    const tmpl = templates.find((t) => t.TemplateID === parseInt(templateIdStr, 10));
    if (tmpl) {
      setTitle(tmpl.TemplateName);
      setDescription(tmpl.Description || '');
      setEstimatedHours(String(tmpl.EstimatedHours || '4.0'));
      setPriority(tmpl.Priority || 'Medium');
      if (tmpl.DepartmentID) setDepartmentId(String(tmpl.DepartmentID));
      if (tmpl.ChecklistJSON) {
        try {
          const items = JSON.parse(tmpl.ChecklistJSON);
          if (Array.isArray(items)) setChecklistItems(items);
        } catch {}
      }
    }
  };

  const handleAddChecklistField = () => {
    setChecklistItems([...checklistItems, '']);
  };

  const handleChecklistTextChange = (index: number, val: string) => {
    const updated = [...checklistItems];
    updated[index] = val;
    setChecklistItems(updated);
  };

  const handleRemoveChecklistField = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleToggleAssignee = (empId: number) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    try {
      setIsSubmitting(true);
      await tasksApi.createTask({
        title: title.trim(),
        description: description.trim(),
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        priority,
        startDate,
        dueDate,
        estimatedHours: parseFloat(estimatedHours) || 0,
        assigneeIds: selectedAssigneeIds,
        checklistItems: checklistItems.filter((item) => item.trim().length > 0),
      });

      onTaskCreated();
      onClose();
    } catch (err) {
      console.error('Task creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Create New Business Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template Quick Selector */}
        {templates.length > 0 && (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 block">
                Load from Pre-defined Template
              </span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="mt-1 w-full bg-white dark:bg-slate-900 text-xs rounded-lg px-2.5 py-1.5 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="">Choose a Template (Optional)...</option>
                {templates.map((t) => (
                  <option key={t.TemplateID} value={t.TemplateID}>
                    {t.TemplateName} ({t.EstimatedHours} hrs)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <Input
          label="Task Title"
          placeholder="e.g. Q3 Network Switch Firmware Upgrade"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Description & Scope
          </label>
          <textarea
            rows={3}
            placeholder="Detailed instructions, acceptance criteria, and notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Row: Dept, Priority, Est Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Select Department...</option>
            {departments.map((d) => (
              <option key={d.DepartmentID} value={d.DepartmentID}>
                {d.DepartmentName}
              </option>
            ))}
          </Select>

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>

          <Input
            label="Estimated Hours"
            type="number"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </div>

        {/* Row: Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        {/* Assignees multi-select pills */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Assign To Employees
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            {employees.map((emp) => {
              const isSelected = selectedAssigneeIds.includes(emp.EmployeeID);
              return (
                <button
                  type="button"
                  key={emp.EmployeeID}
                  onClick={() => handleToggleAssignee(emp.EmployeeID)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{emp.EmployeeName}</span>
                  <span className="text-[10px] opacity-75">({emp.Designation || 'Staff'})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Checklist Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Checklist Steps
            </label>
            <button
              type="button"
              onClick={handleAddChecklistField}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Step
            </button>
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Step ${idx + 1}...`}
                  value={item}
                  onChange={(e) => handleChecklistTextChange(idx, e.target.value)}
                  className="flex-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
                {checklistItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistField(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
