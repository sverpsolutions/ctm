import React, { useState, useEffect } from 'react';
import { AlertOctagon, Plus, Trash2, Save, Check } from 'lucide-react';
import { settingsApi } from '../../services/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

export const EscalationRulesTab: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    settingsApi.getSettings().then((res) => {
      setRules(res.data?.escalationRules || []);
    });
  }, []);

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        EscalationID: Date.now(),
        DaysOverdue: 3,
        EscalateToRole: 'Department Manager',
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
      await settingsApi.saveEscalationRules(rules);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save escalation rules:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Overdue Task Escalation Matrix
          </h3>
          <p className="text-xs text-slate-500">Configure hierarchy escalation tiers when tasks breach committed due dates</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddRule} icon={<Plus className="w-3.5 h-3.5" />}>
            Add Escalation Tier
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={isSaving} icon={savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}>
            {savedSuccess ? 'Saved Escalations' : 'Save Escalations'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div
            key={rule.EscalationID || idx}
            className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs"
          >
            <Input
              label="Days Overdue Trigger"
              type="number"
              min="1"
              value={rule.DaysOverdue}
              onChange={(e) => handleUpdate(idx, 'DaysOverdue', parseInt(e.target.value, 10) || 1)}
            />

            <Select
              label="Escalate Notice To Role"
              value={rule.EscalateToRole}
              onChange={(e) => handleUpdate(idx, 'EscalateToRole', e.target.value)}
            >
              <option value="Employee">Assigned Employee (Level 1 Alert)</option>
              <option value="Department Manager">Department Manager (Level 2 Escalation)</option>
              <option value="Management">Executive Management (Level 3 Escalation)</option>
              <option value="Super Admin">Company Super Admin (Level 4 Critical Alert)</option>
            </Select>

            <div className="flex items-end justify-between gap-2 pt-4">
              <Select
                label="Channel"
                value={rule.Channel}
                onChange={(e) => handleUpdate(idx, 'Channel', e.target.value)}
              >
                <option value="In-App">In-App Notification</option>
                <option value="Email">Email Alert</option>
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
