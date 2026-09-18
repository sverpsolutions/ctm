import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Building,
  RefreshCw,
  Eye,
  Trash2,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Tag,
  ArrowUpDown,
} from 'lucide-react';
import { ImportantDateItem, ImportantDateCategory, Department } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';
import { exportDataToExcel, exportDataToPdf } from '../../utils/exportUtils';

interface ImportantDateListViewProps {
  dates: ImportantDateItem[];
  categories: ImportantDateCategory[];
  departments: Department[];
  pagination: { page: number; totalPages: number; total: number; limit: number };
  onPageChange: (page: number) => void;
  onDateClick: (dateId: number) => void;
  onRenewClick: (item: ImportantDateItem) => void;
  onDeleteDate: (dateId: number) => void;
}

export const ImportantDateListView: React.FC<ImportantDateListViewProps> = ({
  dates,
  categories,
  departments,
  pagination,
  onPageChange,
  onDateClick,
  onRenewClick,
  onDeleteDate,
}) => {
  // Export Excel
  const exportToExcel = async () => {
    const data = dates.map((d) => ({
      'Title': d.Title,
      'Category': d.CategoryName,
      'Expiry / Event Date': new Date(d.ExpiryDate || d.Date).toLocaleDateString(),
      'Status': d.Status,
      'Department': d.DepartmentName || 'General',
      'Responsible Person': d.ResponsiblePersonName || '-',
      'Vendor / Customer': d.RelatedVendor || d.RelatedCustomer || '-',
      'Ref Number': d.ReferenceNumber || '-',
      'Days Left': d.DaysRemaining,
    }));

    await exportDataToExcel(data, 'ImportantDates', `ApexCorp_ImportantDates_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Export PDF
  const exportToPdf = async () => {
    const headers = ['Title', 'Category', 'Expiry Date', 'Department', 'Responsible Person', 'Urgency', 'Time Left'];
    const rows = dates.map((d) => [
      d.Title,
      d.CategoryName,
      new Date(d.ExpiryDate || d.Date).toLocaleDateString(),
      d.DepartmentName || 'General',
      d.ResponsiblePersonName || '-',
      d.SmartCategory,
      d.DaysRemaining !== undefined ? (d.DaysRemaining < 0 ? 'Expired' : `${d.DaysRemaining}d`) : '-',
    ]);

    await exportDataToPdf(
      'Apex Global Solutions — Important Dates & Renewal Schedule',
      headers,
      rows,
      `ApexCorp_ImportantDates_${new Date().toISOString().substring(0, 10)}.pdf`,
      [139, 92, 246]
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Top action bar: Export Buttons */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-xs font-semibold text-slate-500">
          Total: <span className="text-slate-800 dark:text-slate-200 font-bold">{pagination.total}</span> Dates
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}>
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPdf} icon={<FileText className="w-3.5 h-3.5 text-purple-600" />}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold select-none">
              <th className="py-3.5 pl-6 pr-3">Title & Reference</th>
              <th className="py-3.5 px-3">Category</th>
              <th className="py-3.5 px-3">Department</th>
              <th className="py-3.5 px-3">Responsible Person</th>
              <th className="py-3.5 px-3">Expiry / Due Date</th>
              <th className="py-3.5 px-3">Urgency Status</th>
              <th className="py-3.5 px-3">Action Task</th>
              <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {dates.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No important dates matching the selected filters.
                </td>
              </tr>
            ) : (
              dates.map((d) => {
                const daysLeft = d.DaysRemaining ?? 0;
                const isExpired = daysLeft < 0;
                const isCritical = daysLeft >= 0 && daysLeft <= 3;
                const isUrgent = daysLeft >= 4 && daysLeft <= 7;

                return (
                  <tr
                    key={d.ImportantDateID}
                    onClick={() => onDateClick(d.ImportantDateID)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                  >
                    <td className="py-3.5 pl-6 pr-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 max-w-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {d.Title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {d.ReferenceNumber && <span>Ref: {d.ReferenceNumber}</span>}
                        {d.RelatedVendor && <span>• {d.RelatedVendor}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-block"
                        style={{
                          backgroundColor: `${d.CategoryColor || '#6366f1'}15`,
                          color: d.CategoryColor || '#6366f1',
                        }}
                      >
                        {d.CategoryName}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      {d.DepartmentName || 'General'}
                    </td>

                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {d.ResponsiblePersonName || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className={`font-bold ${isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {new Date(d.ExpiryDate || d.Date).toLocaleDateString()}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {d.RecurrenceType || 'Does Not Repeat'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isExpired
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : isCritical
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse'
                            : isUrgent
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isExpired ? 'Expired' : daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {d.GeneratedTaskStatus ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block w-fit ${
                            d.GeneratedTaskStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : d.GeneratedTaskStatus === 'Overdue'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : d.GeneratedTaskStatus === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {d.GeneratedTaskStatus === 'Completed' ? '✅ Done' : d.GeneratedTaskStatus}
                          </span>
                          <span className="text-[9px] text-slate-400">{d.GeneratedTaskNumber}</span>
                        </div>
                      ) : d.AutoGenerateTask ? (
                        <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                          Auto ({d.LeadDaysForTask}d)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Manual</span>
                      )}
                    </td>

                    <td className="py-3.5 pr-6 pl-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onRenewClick(d)}
                          icon={<RefreshCw className="w-3.5 h-3.5" />}
                        >
                          Renew
                        </Button>
                        <button
                          onClick={() => onDateClick(d.ImportantDateID)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteDate(d.ImportantDateID)}
                          title="Delete Date"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.total}
        pageSize={pagination.limit}
        onPageChange={onPageChange}
      />
    </div>
  );
};
