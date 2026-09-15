import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ImportantDateItem } from '../../types';
import { importantDatesApi } from '../../services/api';

interface RenewalModalProps {
  dateItem: ImportantDateItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRenewed: () => void;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({
  dateItem,
  isOpen,
  onClose,
  onRenewed,
}) => {
  const [renewedDate, setRenewedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && dateItem) {
      setRenewedDate(new Date().toISOString().substring(0, 10));
      // Compute 1 year ahead by default if yearly
      const currentExpiry = new Date(dateItem.ExpiryDate || dateItem.Date);
      const nextYear = new Date(currentExpiry);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setNewExpiryDate(nextYear.toISOString().substring(0, 10));
    }
  }, [isOpen, dateItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateItem || !newExpiryDate || !renewedDate) return;

    try {
      setIsSubmitting(true);
      await importantDatesApi.renewDate(dateItem.ImportantDateID, {
        newExpiryDate,
        renewedDate,
        remarks: remarks.trim() || 'Standard renewal cycle completed.',
      });

      onRenewed();
      onClose();
    } catch (err) {
      console.error('Renewal failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !dateItem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="Renew Important Date / Contract">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              {dateItem.Title}
            </h4>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
              Current Expiry:{' '}
              <span className="font-bold">
                {new Date(dateItem.ExpiryDate || dateItem.Date).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Renewal Execution Date"
            type="date"
            value={renewedDate}
            onChange={(e) => setRenewedDate(e.target.value)}
            required
          />
          <Input
            label="New Expiry Date"
            type="date"
            value={newExpiryDate}
            onChange={(e) => setNewExpiryDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Renewal Notes & Reference
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Policy premium paid via cheque #88124, revised SLA active..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<RefreshCw className="w-4 h-4" />}>
            Confirm Renewal
          </Button>
        </div>
      </form>
    </Modal>
  );
};
