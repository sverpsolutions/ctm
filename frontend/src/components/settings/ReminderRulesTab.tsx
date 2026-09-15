import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Save, Check } from 'lucide-react';
import { settingsApi } from '../../services/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

export const ReminderRulesTab: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    settingsApi.getSettings().then((res) => {
      setRules(res.data?.reminderRules || []);
    });
  }, []);

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        RuleID: Date.now(),
        RuleName: 'New Reminder Notice',
        TargetType: 'Both',
        DaysOffset: -5,
        Channel: 'In-App',
        IsActive: 1,
      },
    ]);
  };

  const handleUpdate = (idx: number, field: string, val: any) => {
    const updated = [...rules];
    updated[idx][field] = val;
    setRules(updated);
  };

  const handleRemove = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await settingsApi.saveReminderRules(rules);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save reminder rules:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Automated Reminder Rules & Notifications
          </h3>
          <p className="text-xs text-slate-500">Configure advance notice trigger intervals for tasks and important date expirations</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddRule} icon={<Plus className="w-3.5 h-3.5" />}>
            Add Notice Rule
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={isSaving} icon={savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}>
            {savedSuccess ? 'Saved Rules' : 'Save Rules'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div
            key={rule.RuleID || idx}
            className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-center text-xs"
          >
            <Input
              label="Rule Name"
              value={rule.RuleName}
              onChange={(e) => handleUpdate(idx, 'RuleName', e.target.value)}
            />

            <Select
              label="Applies To"
              value={rule.TargetType}
              onChange={(e) => handleUpdate(idx, 'TargetType', e.target.value)}
            >
              <option value="Both">Tasks & Important Dates</option>
              <option value="ImportantDate">Important Dates Only</option>
              <option value="Task">Tasks Only</option>
            </Select>

            <Input
              label="Days Offset (e.g. -7 = 7 days before, 0 = on due date)"
              type="number"
              value={rule.DaysOffset}
              onChange={(e) => handleUpdate(idx, 'DaysOffset', parseInt(e.target.value, 10) || 0)}
            />

            <div className="flex items-end justify-between gap-2 pt-4">
              <Select
                label="Channel"
                value={rule.Channel}
                onChange={(e) => handleUpdate(idx, 'Channel', e.target.value)}
              >
                <option value="In-App">In-App Notification</option>
                <option value="Email">Email Digest</option>
                <option value="Both">In-App + Email</option>
              </Select>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
