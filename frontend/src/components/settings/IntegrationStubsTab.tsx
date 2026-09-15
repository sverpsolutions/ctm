import React, { useState } from 'react';
import { Mail, MessageCircle, Send, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { settingsApi } from '../../services/api';

export const IntegrationStubsTab: React.FC = () => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  const handleRunScheduler = async () => {
    try {
      setIsTriggering(true);
      const res = await settingsApi.triggerScheduler();
      setTriggerResult(`Scheduler job executed successfully: Processed overdue tasks, dispatched idempotent reminders.`);
      setTimeout(() => setTriggerResult(null), 6000);
    } catch (err) {
      console.error('Failed to trigger scheduler:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Background Scheduler Control Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Automated Cron & Scheduler Engine
            </h3>
            <p className="text-xs text-slate-500">
              The scheduler runs daily at 00:05 and every 2 hours to scan overdue tasks, send advance reminders, and auto-generate date tasks.
            </p>
          </div>

          <Button onClick={handleRunScheduler} isLoading={isTriggering} icon={<Play className="w-4 h-4" />}>
            Trigger Scheduler Now
          </Button>
        </div>

        {triggerResult && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{triggerResult}</span>
          </div>
        )}
      </div>

      {/* Integration Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Email SMTP */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">SMTP Email Gateway</h4>
              <span className="text-[10px] text-emerald-600 font-bold">Connected (Active)</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Sends daily digest, task assignment alerts, and manager escalation emails.</p>
        </div>

        {/* WhatsApp API */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">WhatsApp Business API</h4>
              <span className="text-[10px] text-slate-400 font-bold">Ready for Webhook</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Sends critical date warnings and overdue task reminders via WhatsApp templates.</p>
        </div>

        {/* Telegram Bot */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Telegram Bot Channel</h4>
              <span className="text-[10px] text-slate-400 font-bold">Ready for Bot Token</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Dispatches real-time broadcast alerts to corporate leadership channel.</p>
        </div>
      </div>
    </div>
  );
};
