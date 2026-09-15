import React, { useState } from 'react';
import { BarChart3, CheckSquare, CalendarClock, Users, Building } from 'lucide-react';
import { Tabs } from '../components/common/Tabs';
import { useTenant } from '../context/TenantContext';
import { TaskReportsTab } from '../components/reports/TaskReportsTab';
import { DateReportsTab } from '../components/reports/DateReportsTab';
import { EmployeePerformanceTab } from '../components/reports/EmployeePerformanceTab';
import { DepartmentPerformanceTab } from '../components/reports/DepartmentPerformanceTab';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const { activeCompanyId, activeCompany } = useTenant();

  const tabs = [
    { id: 'tasks', label: 'Task Reports', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'dates', label: 'Important Date Expiries', icon: <CalendarClock className="w-4 h-4" /> },
    { id: 'employees', label: 'Staff Performance Scorecards', icon: <Users className="w-4 h-4" /> },
    { id: 'departments', label: 'Department Analytics', icon: <Building className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Executive Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generating reports for <strong className="text-slate-700 dark:text-slate-300">{activeCompany?.CompanyName || 'Selected Organization'}</strong> with instant Excel and PDF exports
          </p>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="pt-2" key={`${activeTab}-${activeCompanyId}`}>
        {activeTab === 'tasks' && <TaskReportsTab />}
        {activeTab === 'dates' && <DateReportsTab />}
        {activeTab === 'employees' && <EmployeePerformanceTab />}
        {activeTab === 'departments' && <DepartmentPerformanceTab />}
      </div>
    </div>
  );
};
