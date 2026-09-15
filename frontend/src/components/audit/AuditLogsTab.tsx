import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, History, User } from 'lucide-react';
import { settingsApi } from '../../services/api';
import { Pagination } from '../common/Pagination';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';

export const AuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await settingsApi.getAuditLogs({
        page,
        limit: 20,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
      });
      setLogs(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0, limit: 20 });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [entityFilter, actionFilter]);

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            System Security & Activity Audit Trail
          </h3>
          <p className="text-xs text-slate-500">Immutable ledger of all user logins, task creations, progress updates, and master record edits</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="">All Entities</option>
            <option value="Auth">Auth & Logins</option>
            <option value="Task">Tasks</option>
            <option value="ImportantDate">Important Dates</option>
            <option value="Employee">Staff</option>
            <option value="Masters">Masters</option>
          </Select>

          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="DELETE">DELETE</option>
          </Select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No audit records logged for the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.AuditID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {new Date(log.CreatedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {log.Username || 'System'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.Action === 'LOGIN'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.Action === 'DELETE'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : log.Action === 'APPROVE'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {log.Action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {log.EntityName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{log.EntityID ? `#${log.EntityID}` : '-'}</td>
                    <td className="py-3 px-4 text-slate-400">{log.IPAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(p) => fetchLogs(p)}
        />
      </div>
    </div>
  );
};
