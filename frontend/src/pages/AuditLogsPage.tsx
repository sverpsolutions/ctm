import React from 'react';
import { AuditLogsTab } from '../components/audit/AuditLogsTab';

export const AuditLogsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          System Audit Log & Traceability Ledger
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Complete, unalterable historical log of user actions, approvals, progress updates, and data revisions
        </p>
      </div>

      <AuditLogsTab />
    </div>
  );
};
