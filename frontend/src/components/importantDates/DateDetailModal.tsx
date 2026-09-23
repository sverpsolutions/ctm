import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Building,
  Building2,
  RefreshCw,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  CheckSquare,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ImportantDateItem } from '../../types';
import { importantDatesApi } from '../../services/api';

interface DateDetailModalProps {
  dateId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRenewal: (item: ImportantDateItem) => void;
}

export const DateDetailModal: React.FC<DateDetailModalProps> = ({
  dateId,
  isOpen,
  onClose,
  onOpenRenewal,
}) => {
  const [dateItem, setDateItem] = useState<ImportantDateItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && dateId) {
      setIsLoading(true);
      importantDatesApi
        .getDateById(dateId)
        .then((res) => setDateItem(res.data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, dateId]);

  if (!isOpen || !dateId) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      {isLoading || !dateItem ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-medium">Loading date details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {(dateItem.CompanyName || dateItem.CompanyCode) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span>{dateItem.CompanyName}</span>
                    {dateItem.CompanyCode && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        {dateItem.CompanyCode}
                      </span>
                    )}
                  </span>
                )}
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: `${dateItem.CategoryColor || '#6366f1'}15`,
                    color: dateItem.CategoryColor || '#6366f1',
                  }}
                >
                  {dateItem.CategoryName}
                </span>
                <Badge
                  variant={
                    dateItem.SmartCategory === 'Critical'
                      ? 'danger'
                      : dateItem.SmartCategory === 'Urgent'
                      ? 'warning'
                      : 'primary'
                  }
                >
                  {dateItem.SmartCategory}
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {dateItem.Title}
              </h2>
              {dateItem.ReferenceNumber && (
                <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                  Ref No: {dateItem.ReferenceNumber}
                </span>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenRenewal(dateItem);
              }}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Renew Date
            </Button>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Company Context</span>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Building2 className="w-4 h-4 text-indigo-500" />
                {dateItem.CompanyName || dateItem.CompanyCode || `Company #${dateItem.CompanyID}`}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Expiry / Event Date</span>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {new Date(dateItem.ExpiryDate || dateItem.Date).toLocaleDateString()}
                <span className="text-xs font-medium text-slate-400">
                  ({dateItem.DaysRemaining !== undefined ? (dateItem.DaysRemaining < 0 ? `Expired ${Math.abs(dateItem.DaysRemaining)}d ago` : `${dateItem.DaysRemaining} days remaining`) : ''})
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Responsible Person</span>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <User className="w-4 h-4 text-indigo-500" />
                {dateItem.ResponsiblePersonName || 'Department Head'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Recurrence Pattern</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {dateItem.RecurrenceType || 'Does Not Repeat'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Department</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {dateItem.DepartmentName || 'General'}
              </span>
            </div>
          </div>

          {/* Description / Notes */}
          {(dateItem.Description || dateItem.Notes) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Description & Notes
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed whitespace-pre-line">
                {dateItem.Description || dateItem.Notes}
              </p>
            </div>
          )}

          {/* Renewal History Log */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4" /> Renewal & Cycle History
            </h4>
            {(dateItem.renewalHistory || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                Initial cycle in progress. No previous renewals recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {(dateItem.renewalHistory || []).map((h) => (
                  <div
                    key={h.HistoryID}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>Renewed on {new Date(h.RenewedDate).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-400">
                        New Expiry: {new Date(h.NewExpiryDate).toLocaleDateString()}
                      </span>
                    </div>
                    {h.Remarks && <p className="text-slate-500 text-[11px]">{h.Remarks}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Auto-Generated Tasks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" /> Generated Action Tasks
            </h4>
            {(dateItem.relatedTasks || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                No tasks generated for this date.
              </p>
            ) : (
              <div className="space-y-2">
                {(dateItem.relatedTasks || []).map((t) => (
                  <div
                    key={t.TaskID}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <div>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                        {t.TaskNumber}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {t.TaskTitle}
                      </span>
                    </div>
                    <Badge variant={t.Status === 'Completed' ? 'success' : 'primary'}>
                      {t.Status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
