import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  Plus,
  Filter,
  Search,
  AlertTriangle,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { importantDatesApi, mastersApi } from '../services/api';
import { ImportantDateItem, ImportantDateCategory, Department } from '../types';
import { ImportantDateListView } from '../components/importantDates/ImportantDateListView';
import { DateDetailModal } from '../components/importantDates/DateDetailModal';
import { DateFormModal } from '../components/importantDates/DateFormModal';
import { RenewalModal } from '../components/importantDates/RenewalModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';

export const ImportantDatesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { activeCompanyId, accessibleCompanies } = useTenant();
  const [searchParams] = useSearchParams();

  const [dates, setDates] = useState<ImportantDateItem[]>([]);
  const [categories, setCategories] = useState<ImportantDateCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 15 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const [smartCategory, setSmartCategory] = useState<string>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [selectedDateId, setSelectedDateId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [renewalItem, setRenewalItem] = useState<ImportantDateItem | null>(null);
  const [isRenewalOpen, setIsRenewalOpen] = useState<boolean>(false);
  const [dateToDelete, setDateToDelete] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setSelectedDateId(parseInt(highlightId, 10));
      setIsDetailOpen(true);
    }
    const filterParam = searchParams.get('filter');
    if (filterParam === 'critical') setSmartCategory('Critical');
  }, [searchParams]);

  const fetchDates = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await importantDatesApi.getImportantDates({
        page,
        limit: 15,
        companyId: selectedCompanyFilter ? parseInt(selectedCompanyFilter, 10) : undefined,
        search: search.trim() || undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
        smartCategory: smartCategory !== 'all' ? smartCategory : undefined,
      });

      setDates(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0, limit: 15 });
    } catch (err) {
      console.error('Failed to load important dates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([importantDatesApi.getCategories(), mastersApi.getDepartments()]).then(
      ([catRes, deptRes]) => {
        setCategories(catRes.data || []);
        setDepartments(deptRes.data || []);
      }
    );
  }, [activeCompanyId]);

  useEffect(() => {
    fetchDates(pagination.page);
  }, [smartCategory, categoryId, departmentId, activeCompanyId, selectedCompanyFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDates(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDateClick = (id: number) => {
    setSelectedDateId(id);
    setIsDetailOpen(true);
  };

  const handleOpenRenewal = (item: ImportantDateItem) => {
    setRenewalItem(item);
    setIsRenewalOpen(true);
  };

  const handleDeleteSingle = (id: number) => {
    setDateToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!dateToDelete) return;
    try {
      await importantDatesApi.deleteDate(dateToDelete);
      setIsDeleteConfirmOpen(false);
      setDateToDelete(null);
      fetchDates(pagination.page);
    } catch (err) {
      console.error('Delete date failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Important Dates & Renewal Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor contract expiries, AMCs, licenses, insurance policies, and compliance deadlines
          </p>
        </div>

        {hasPermission('dates.create') && (
          <Button onClick={() => setIsFormOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Add Important Date
          </Button>
        )}
      </div>

      {/* Filter and Smart Tabs Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        {/* Smart Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'Critical', label: '🚨 Critical (0-3 Days)', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950' },
            { id: 'Urgent', label: '⚠️ Urgent (4-7 Days)', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
            { id: 'Upcoming', label: '📅 Upcoming (8-30 Days)', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950' },
            { id: 'Future', label: 'Future (31+ Days)', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
            { id: 'Expired', label: 'Expired', color: 'text-rose-700 bg-rose-100 dark:bg-rose-900' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSmartCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                smartCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Secondary Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search dates, vendors, reference numbers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          <Select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
          >
            <option value="">All Accessible Companies</option>
            {accessibleCompanies.map((c) => (
              <option key={c.CompanyID} value={c.CompanyID}>
                {c.CompanyName} ({c.CompanyCode})
              </option>
            ))}
          </Select>

          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All 22 Date Categories</option>
            {categories.map((c) => (
              <option key={c.CategoryID} value={c.CategoryID}>
                {c.CategoryName}
              </option>
            ))}
          </Select>

          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.DepartmentID} value={d.DepartmentID}>
                {d.DepartmentName}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Main Table View */}
      <ImportantDateListView
        dates={dates}
        categories={categories}
        departments={departments}
        pagination={pagination}
        onPageChange={(p) => fetchDates(p)}
        onDateClick={handleDateClick}
        onRenewClick={handleOpenRenewal}
        onDeleteDate={handleDeleteSingle}
      />

      {/* Details Modal */}
      {selectedDateId && (
        <DateDetailModal
          dateId={selectedDateId}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedDateId(null);
          }}
          onOpenRenewal={handleOpenRenewal}
        />
      )}

      {/* Create Modal */}
      {isFormOpen && (
        <DateFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onDateCreated={() => fetchDates(1)}
        />
      )}

      {/* Renewal Modal */}
      {renewalItem && (
        <RenewalModal
          dateItem={renewalItem}
          isOpen={isRenewalOpen}
          onClose={() => {
            setIsRenewalOpen(false);
            setRenewalItem(null);
          }}
          onRenewed={() => fetchDates(pagination.page)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Important Date"
          message="Are you sure you want to delete this date record? This will archive the contract record."
          confirmText="Delete Date"
          variant="danger"
        />
      )}
    </div>
  );
};
