import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { ImportantDateCategory, Department, Employee } from '../../types';
import { importantDatesApi, mastersApi } from '../../services/api';

interface DateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateCreated: () => void;
}

export const DateFormModal: React.FC<DateFormModalProps> = ({
  isOpen,
  onClose,
  onDateCreated,
}) => {
  const [categories, setCategories] = useState<ImportantDateCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [recurrenceType, setRecurrenceType] = useState<string>('Yearly');
  const [priority, setPriority] = useState<string>('High');
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [autoGenerateTask, setAutoGenerateTask] = useState<boolean>(true);
  const [leadDays, setLeadDays] = useState<string>('15');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        importantDatesApi.getCategories(),
        mastersApi.getDepartments(),
        mastersApi.getEmployees(),
      ]).then(([catRes, deptRes, empRes]) => {
        setCategories(catRes.data || []);
        if (catRes.data?.length > 0 && !categoryId) {
          setCategoryId(String(catRes.data[0].CategoryID));
        }
        setDepartments(deptRes.data || []);
        setEmployees(empRes.data || []);
      });

      // Default date: 30 days from now
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const dateStr = nextMonth.toISOString().substring(0, 10);
      setDate(dateStr);
      setExpiryDate(dateStr);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId || !expiryDate) return;

    try {
      setIsSubmitting(true);
      await importantDatesApi.createDate({
        title: title.trim(),
        categoryId: parseInt(categoryId, 10),
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        date: expiryDate,
        expiryDate,
        recurrenceType,
        priority,
        responsibleEmployeeId: responsibleEmployeeId ? parseInt(responsibleEmployeeId, 10) : null,
        relatedVendor: vendor.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        description: description.trim() || null,
        autoGenerateTask: autoGenerateTask ? 1 : 0,
        leadDaysForTask: parseInt(leadDays, 10) || 15,
        reminders: [30, 15, 7, 1],
      });

      onDateCreated();
      onClose();
    } catch (err) {
      console.error('Date creation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Add Company Important Date / Renewal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title / Asset Name"
          placeholder="e.g. Cisco Core Router AMC Renewal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {categories.map((c) => (
              <option key={c.CategoryID} value={c.CategoryID}>
                {c.CategoryName}
              </option>
            ))}
          </Select>

          <Select
            label="Recurrence Frequency"
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value)}
          >
            <option value="Does Not Repeat">Does Not Repeat (One-time)</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Half-Yearly">Half-Yearly</option>
            <option value="Yearly">Yearly</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Expiry / Due Date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            required
          />

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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Responsible Person"
            value={responsibleEmployeeId}
            onChange={(e) => setResponsibleEmployeeId(e.target.value)}
          >
            <option value="">Select Responsible Employee...</option>
            {employees.map((emp) => (
              <option key={emp.EmployeeID} value={emp.EmployeeID}>
                {emp.EmployeeName} ({emp.Designation || 'Staff'})
              </option>
            ))}
          </Select>

          <Input
            label="Vendor / Counterparty"
            placeholder="e.g. Cisco Systems India Pvt Ltd"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </div>

        <Input
          label="Contract / Reference Number"
          placeholder="e.g. AMC-CISCO-2026-99"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Scope & Instructions
          </label>
          <textarea
            rows={3}
            placeholder="Key terms, renewal conditions, contact details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Automatic Task Generation Toggle */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Auto-generate Action Task
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              System creates an assigned workflow task before the expiry date.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoGenerateTask}
              onChange={(e) => setAutoGenerateTask(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            {autoGenerateTask && (
              <select
                value={leadDays}
                onChange={(e) => setLeadDays(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 outline-none"
              >
                <option value="7">7 days before</option>
                <option value="15">15 days before</option>
                <option value="30">30 days before</option>
                <option value="60">60 days before</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Important Date
          </Button>
        </div>
      </form>
    </Modal>
  );
};
