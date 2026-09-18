import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  Building2,
  Calendar,
  Clock,
  Paperclip,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  FileText,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Department, Employee, TaskCategory, TaskTemplate, UserCompanyAccess } from '../../types';
import { tasksApi, mastersApi, settingsApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

const TASK_TYPES = [
  'General',
  'Routine',
  'Compliance',
  'Operational',
  'Project',
  'Urgent',
  'Financial',
  'Audit',
  'Maintenance',
  'IT & Security',
  'HR & Admin',
  'Legal & Statutory',
];

const TASK_STATUSES = [
  'New',
  'In Progress',
  'Pending',
  'On Hold',
  'Completed',
];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const { accessibleCompanies, activeCompanyId } = useTenant();

  // Master Data State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);

  // Company Selector State (Searchable)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<string>('General');
  const [priority, setPriority] = useState<string>('Medium');
  const [categoryId, setCategoryId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState<string>('');
  const [reminderDate, setReminderDate] = useState<string>('');
  const [status, setStatus] = useState<string>('New');
  const [remarks, setRemarks] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<string>('4.0');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [tags, setTags] = useState('');

  // Attachments
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);

      // Default company: activeCompanyId if accessible, else first accessible company
      const defaultComp =
        accessibleCompanies.find((c) => c.CompanyID === activeCompanyId) ||
        accessibleCompanies.find((c) => c.IsPrimary) ||
        accessibleCompanies[0];

      const initialCompId = defaultComp ? String(defaultComp.CompanyID) : '';
      setSelectedCompanyId(initialCompId);

      // Default due date: tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().substring(0, 10));

      // Reset other fields
      setTitle('');
      setDescription('');
      setTaskType('General');
      setPriority('Medium');
      setCategoryId('');
      setDepartmentId('');
      setStatus('New');
      setRemarks('');
      setEstimatedHours('4.0');
      setSelectedAssigneeIds([]);
      setChecklistItems(['']);
      setSelectedTemplateId('');
      setTags('');
      setAttachedFiles([]);
      setCompanySearchQuery('');
      setIsCompanyDropdownOpen(false);
    }
  }, [isOpen, accessibleCompanies, activeCompanyId]);

  // Load masters whenever selectedCompanyId changes
  useEffect(() => {
    if (!isOpen || !selectedCompanyId) return;

    const compIdNum = parseInt(selectedCompanyId, 10);
    if (isNaN(compIdNum)) return;

    // Fetch company-specific departments, employees, and categories
    Promise.all([
      mastersApi.getDepartments(),
      mastersApi.getEmployees(),
      tasksApi.getTemplates().catch(() => ({ data: [] })),
      settingsApi.getSettings().catch(() => ({ data: { taskCategories: [] } })),
    ])
      .then(([deptRes, empRes, tmplRes, settingsRes]) => {
        const allDepts: Department[] = deptRes.data || [];
        const allEmps: Employee[] = empRes.data || [];

        // Filter by selected company if CompanyID is present on record, or keep all if tenant isolated
        const filteredDepts = allDepts.filter((d) => !d.CompanyID || d.CompanyID === compIdNum);
        const filteredEmps = allEmps.filter((e) => !e.CompanyID || e.CompanyID === compIdNum);

        setDepartments(filteredDepts.length > 0 ? filteredDepts : allDepts);
        setEmployees(filteredEmps.length > 0 ? filteredEmps : allEmps);
        setTemplates(tmplRes.data || []);
        setCategories(settingsRes.data?.taskCategories || []);

        // Clear previous department/assignee if not in new company
        setDepartmentId('');
        setSelectedAssigneeIds([]);
      })
      .catch((err) => {
        console.error('Failed to load masters for company:', err);
      });
  }, [selectedCompanyId, isOpen]);

  // Filtered accessible companies for searchable dropdown
  const filteredCompanies = accessibleCompanies.filter((c) => {
    const q = companySearchQuery.toLowerCase();
    return (
      c.CompanyName.toLowerCase().includes(q) ||
      c.CompanyCode.toLowerCase().includes(q)
    );
  });

  const currentSelectedCompany = accessibleCompanies.find(
    (c) => String(c.CompanyID) === selectedCompanyId
  );

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCompanyId) {
      setErrorMessage('Please select a company. Company is required for all tasks.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    if (!dueDate) {
      setErrorMessage('Due date is required.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Create Task with mandatory companyId and all fields
      const res = await tasksApi.createTask({
        companyId: parseInt(selectedCompanyId, 10),
        title: title.trim(),
        description: description.trim(),
        taskType: taskType || 'General',
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        reminderDate: reminderDate || null,
        remarks: remarks.trim() || null,
        status: status || 'New',
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        priority,
        startDate: startDate || null,
        dueDate,
        estimatedHours: parseFloat(estimatedHours) || 0,
        assigneeIds: selectedAssigneeIds,
        checklistItems: checklistItems.filter((item) => item.trim().length > 0),
        tags: tags.trim() || null,
      });

      const newTaskId = res.taskId || res.data?.TaskID;

      // 2. Upload attachments if provided
      if (newTaskId && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          try {
            await tasksApi.uploadAttachment(newTaskId, file);
          } catch (uploadErr) {
            console.error('Failed to upload file attachment:', uploadErr);
          }
        }
      }

      onTaskCreated();
      onClose();
    } catch (err: any) {
      console.error('Task creation failed:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to create task. Please verify your permissions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Create New Business Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

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

        {/* 1. MANDATORY COMPANY SELECTOR (Searchable Dropdown) */}
        <div className="relative">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Company <span className="text-rose-500">*</span>
            </span>
            <span className="text-[10px] font-normal text-slate-400">
              Only authorized companies are shown
            </span>
          </label>

          {/* Trigger Button */}
          <div
            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm cursor-pointer hover:border-indigo-500 transition shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              {currentSelectedCompany ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {currentSelectedCompany.CompanyName}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    {currentSelectedCompany.CompanyCode}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400">Select Company ▼</span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isCompanyDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </div>

          {/* Dropdown Panel */}
          {isCompanyDropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Search Inside Dropdown */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search company name or code..."
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Company Items List */}
              <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
                {filteredCompanies.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No authorized companies found.
                  </div>
                ) : (
                  filteredCompanies.map((c) => {
                    const isSelected = String(c.CompanyID) === selectedCompanyId;
                    return (
                      <div
                        key={c.CompanyID}
                        onClick={() => {
                          setSelectedCompanyId(String(c.CompanyID));
                          setIsCompanyDropdownOpen(false);
                          setCompanySearchQuery('');
                        }}
                        className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{c.CompanyName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {c.CompanyCode}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. TASK TITLE */}
        <Input
          label="Task Title"
          placeholder="e.g. Q3 Compliance Filing & Statutory Tax Audit"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* 3. DESCRIPTION */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Task Description & Scope
          </label>
          <textarea
            rows={3}
            placeholder="Detailed instructions, operational requirements, and deliverables..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* 4. ROW: Task Type, Priority, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Task Type"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
          >
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
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

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {TASK_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>
        </div>

        {/* 5. ROW: Category, Department, Estimated Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select Category (Optional)...</option>
            {categories.map((c) => (
              <option key={c.CategoryID} value={c.CategoryID}>
                {c.CategoryName}
              </option>
            ))}
          </Select>

          <Select
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Select Department (Optional)...</option>
            {departments.map((d) => (
              <option key={d.DepartmentID} value={d.DepartmentID}>
                {d.DepartmentName}
              </option>
            ))}
          </Select>

          <Input
            label="Estimated Hours"
            type="number"
            step="0.5"
            placeholder="e.g. 4.0"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </div>

        {/* 6. ROW: Start Date, Due Date, Reminder */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="Due Date *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Reminder</span>
            </label>
            <input
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* 7. ASSIGNED TO (Employees of selected company) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Assigned To</span>
            <span className="text-[10px] font-normal text-slate-400">
              {selectedAssigneeIds.length} employee(s) selected
            </span>
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
            {employees.length === 0 ? (
              <span className="text-xs text-slate-400 py-1">
                No staff directory entries found for the selected company.
              </span>
            ) : (
              employees.map((emp) => {
                const isSelected = selectedAssigneeIds.includes(emp.EmployeeID);
                return (
                  <button
                    type="button"
                    key={emp.EmployeeID}
                    onClick={() => handleToggleAssignee(emp.EmployeeID)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span>{emp.EmployeeName}</span>
                    <span className="text-[10px] opacity-75">({emp.Designation || 'Staff'})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 8. REMARKS */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Initial Remarks & Notes
          </label>
          <textarea
            rows={2}
            placeholder="Special instructions, handover remarks, or internal comments..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs px-3.5 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* 9. ATTACHMENTS */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
            <span>Attachments (Optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-50 transition flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Choose Files...</span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-slate-400">
              PDF, DOCX, XLSX, PNG, JPG (Up to 25MB)
            </span>
          </div>

          {/* Attached Files Pills */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachedFiles.map((file, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[160px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 10. DYNAMIC CHECKLIST STEPS */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
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
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
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

        {/* Tags */}
        <Input
          label="Tags (Comma-separated)"
          placeholder="e.g. Audit, Q3, Finance, Priority"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

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
