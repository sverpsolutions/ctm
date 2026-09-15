import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  History,
} from 'lucide-react';
import { reportsApi } from '../../services/api';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { exportDataToExcel, exportDataToPdf } from '../../utils/exportUtils';

export const DateReportsTab: React.FC = () => {
  const [dates, setDates] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<string>('30');
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const res = await reportsApi.getDateReports({ range: timeframe });
      const records = Array.isArray(res.data) ? res.data : res.data?.records || [];
      setDates(records);
    } catch (err) {
      console.error('Failed to load date reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [timeframe]);

  const handleExportExcel = async () => {
    const data = dates.map((d) => ({
      'Title': d.Title,
      'Category': d.CategoryName,
      'Department': d.DepartmentName || 'General',
      'Responsible Person': d.ResponsiblePerson || '-',
      'Expiry Date': d.ExpiryDate || d.Date ? new Date(d.ExpiryDate || d.Date).toLocaleDateString() : '-',
      'Days Remaining': d.DaysRemaining,
      'Priority': d.Priority,
      'Vendor': d.RelatedVendor || '-',
      'Reference No': d.ReferenceNumber || '-',
    }));

    await exportDataToExcel(data, 'ExpiringDates', `ApexCorp_Expiring_Dates_${timeframe}Days.xlsx`);
  };

  const handleExportPdf = async () => {
    const headers = ['Title', 'Category', 'Department', 'Responsible Person', 'Expiry Date', 'Days Left', 'Priority'];
    const rows = dates.map((d) => [
      d.Title,
      d.CategoryName,
      d.DepartmentName || 'General',
      d.ResponsiblePerson || '-',
      d.ExpiryDate || d.Date ? new Date(d.ExpiryDate || d.Date).toLocaleDateString() : '-',
      d.DaysRemaining !== undefined ? (d.DaysRemaining <= 0 ? 'Today' : `${d.DaysRemaining}d`) : '-',
      d.Priority,
    ]);

    await exportDataToPdf(
      `Apex Global Solutions — Expiring Important Dates (${timeframe} Days Scope)`,
      headers,
      rows,
      `ApexCorp_Expiring_Dates_${timeframe}Days.pdf`,
      [139, 92, 246]
    );
  };

  return (
    <div className="space-y-6">
      {/* Timeframe Scope Selector & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Important Dates Horizon Filter
          </h3>
          <p className="text-xs text-slate-500">
            View contracts, AMCs, licenses, and renewals expiring within selected timeframe
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="7">Next 7 Days</option>
            <option value="15">Next 15 Days</option>
            <option value="30">Next 30 Days</option>
            <option value="60">Next 60 Days</option>
            <option value="expired">Expired</option>
            <option value="all">All Dates</option>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportExcel} icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}>
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} icon={<FileText className="w-3.5 h-3.5 text-purple-600" />}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Responsible Person</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Time Remaining</th>
                <th className="py-3 px-4">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No important dates expiring in the next {timeframe} days.
                  </td>
                </tr>
              ) : (
                dates.map((d) => (
                  <tr key={d.ImportantDateID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">{d.Title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {d.CategoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{d.DepartmentName || 'General'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{d.ResponsiblePerson || '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {d.ExpiryDate || d.Date ? new Date(d.ExpiryDate || d.Date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {d.DaysRemaining !== undefined ? (d.DaysRemaining <= 0 ? 'Today/Expired' : `${d.DaysRemaining} days`) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {d.Priority}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
