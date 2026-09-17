import React, { useState } from 'react';
import { Building2, MapPin, Building, Users, ShieldCheck } from 'lucide-react';
import { Tabs } from '../components/common/Tabs';
import { useTenant } from '../context/TenantContext';
import { CompanyTab } from '../components/masters/CompanyTab';
import { LocationsTab } from '../components/masters/LocationsTab';
import { DepartmentsTab } from '../components/masters/DepartmentsTab';
import { EmployeesTab } from '../components/masters/EmployeesTab';
import { RolesPermissionsTab } from '../components/masters/RolesPermissionsTab';
import { UserCompanyRightsPage } from './UserCompanyRightsPage';

export const MastersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('company');
  const { activeCompanyId, activeCompany } = useTenant();

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'locations', label: 'Locations & Branches', icon: <MapPin className="w-4 h-4" /> },
    { id: 'departments', label: 'Departments', icon: <Building className="w-4 h-4" /> },
    { id: 'employees', label: 'Staff & Employees', icon: <Users className="w-4 h-4" /> },
    { id: 'roles', label: 'Roles & RBAC Matrix', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'user-rights', label: 'User Company Rights', icon: <ShieldCheck className="w-4 h-4 text-emerald-500" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Master Data & Staff Directory
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Managing master records for <strong className="text-slate-700 dark:text-slate-300">{activeCompany?.CompanyName || 'Active Organization'}</strong>
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="pt-2" key={`${activeTab}-${activeCompanyId}`}>
        {activeTab === 'company' && <CompanyTab />}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'roles' && <RolesPermissionsTab />}
        {activeTab === 'user-rights' && <UserCompanyRightsPage />}
      </div>
    </div>
  );
};
