import React, { useState } from 'react';
import { Bell, AlertOctagon, Share2 } from 'lucide-react';
import { Tabs } from '../components/common/Tabs';
import { ReminderRulesTab } from '../components/settings/ReminderRulesTab';
import { EscalationRulesTab } from '../components/settings/EscalationRulesTab';
import { IntegrationStubsTab } from '../components/settings/IntegrationStubsTab';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('reminders');

  const tabs = [
    { id: 'reminders', label: 'Reminder Rules', icon: <Bell className="w-4 h-4" /> },
    { id: 'escalations', label: 'Escalation Rules', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'scheduler', label: 'Scheduler & Gateways', icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          System Rules & Automation Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure notification schedules, overdue escalation hierarchies, and background execution triggers
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="pt-2">
        {activeTab === 'reminders' && <ReminderRulesTab />}
        {activeTab === 'escalations' && <EscalationRulesTab />}
        {activeTab === 'scheduler' && <IntegrationStubsTab />}
      </div>
    </div>
  );
};
