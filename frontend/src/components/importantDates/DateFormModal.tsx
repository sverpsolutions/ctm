import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  ChevronDown,
  AlertCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { ImportantDateCategory, Department, Employee } from '../../types';
import { importantDatesApi, mastersApi } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

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
  const { accessibleCompanies, activeCompanyId } = useTenant();

  // Company Selector State (Searchable)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // Master Data State
  const [categories, setCategories] = useState<ImportantDateCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Form Fields State
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

  // UI State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);

      // Default company: activeCompanyId if accessible, else primary, else first accessible
      const defaultComp =
        accessibleCompanies.find((c) => c.CompanyID === activeCompanyId) ||
        accessibleCompanies.find((c) => c.IsPrimary) ||
        accessibleCompanies[0];

      const initialCompId = defaultComp ? String(defaultComp.CompanyID) : '';
      setSelectedCompanyId(initialCompId);
      setCompanySearchQuery('');
      setIsCompanyDropdownOpen(false);

      // Default date: 30 days from now
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const dateStr = nextMonth.toISOString().substring(0, 10);
      setDate(dateStr);
      setExpiryDate(dateStr);

      // Reset form fields
      setTitle('');
      setDepartmentId('');
      setRecurrenceType('Yearly');
      setPriority('High');
      setResponsibleEmployeeId('');
      setVendor('');
      setReferenceNumber('');
      setDescription('');
      setAutoGenerateTask(true);
      setLeadDays('15');
    }
  }, [isOpen, accessibleCompanies, activeCompanyId]);

  // Load masters whenever modal opens or selectedCompanyId changes
  useEffect(() => {
    if (!isOpen) return;

    const compIdNum = selectedCompanyId ? parseInt(selectedCompanyId, 10) : undefined;

    Promise.all([
      importantDatesApi.getCategories(),
      mastersApi.getDepartments(),
      mastersApi.getEmployees(),
    ]).then(([catRes, deptRes, empRes]) => {
      setCategories(catRes.data || []);
      if (catRes.data?.length > 0 && !categoryId) {
        setCategoryId(String(catRes.data[0].CategoryID));
      }
      const allDepts: Department[] = deptRes.data || [];
      const allEmps: Employee[] = empRes.data || [];

      const filteredDepts = compIdNum
        ? allDepts.filter((d) => !d.CompanyID || d.CompanyID === compIdNum)
        : allDepts;
      const filteredEmps = compIdNum
        ? allEmps.filter((e) => !e.CompanyID || e.CompanyID === compIdNum)
        : allEmps;

      setDepartments(filteredDepts.length > 0 ? filteredDepts : allDepts);
      setEmployees(filteredEmps.length > 0 ? filteredEmps : allEmps);
    });
  }, [isOpen, selectedCompanyId]);

  // Resolved selected company object
  const currentSelectedCompany = accessibleCompanies.find(
    (c) => String(c.CompanyID) === selectedCompanyId
  );

  // Filtered companies for search inside dropdown
  const filteredCompanies = accessibleCompanies.filter((c) => {
    const q = companySearchQuery.toLowerCase();
    return (
      c.CompanyName.toLowerCase().includes(q) ||
      c.CompanyCode.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCompanyId) {
      setErrorMessage('Please select a company. Company is required for all important dates.');
      return;
    }

    if (!title.trim() || !categoryId || !expiryDate) {
      setErrorMessage('Title, category, and expiry date are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await importantDatesApi.createDate({
        companyId: parseInt(selectedCompanyId, 10),
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
    } catch (err: any) {
      console.error('Date creation failed:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to create important date. Please verify your permissions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Add Company Important Date / Renewal">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
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
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{c.CompanyName}</span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {c.CompanyCode}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

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

