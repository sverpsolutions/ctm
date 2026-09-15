import React, { useState, useEffect } from 'react';
import { platformApi } from '../services/api';
import { Building2, Users, FileCheck, Clock, AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
    </div>
  </div>
);

export default function PlatformDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await platformApi.getDashboard();
      setDashboard(data.dashboard);
    } catch (err) {
      console.error('Failed to load platform dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="text-center text-gray-500 py-10">Failed to load dashboard data.</div>;
  }

  const t = dashboard.tenants || {};
  const r = dashboard.registrations || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all tenants, companies, and users across the platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tenants" value={t.TotalTenants || 0} icon={<Building2 size={20} className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Active Tenants" value={t.ActiveTenants || 0} icon={<CheckCircle size={20} className="text-green-600" />} color="bg-green-50" />
        <StatCard title="Total Companies" value={dashboard.totalCompanies || 0} icon={<BarChart3 size={20} className="text-purple-600" />} color="bg-purple-50" />
        <StatCard title="Total Users" value={dashboard.totalUsers || 0} icon={<Users size={20} className="text-indigo-600" />} color="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Tenants" value={t.PendingTenants || 0} icon={<Clock size={20} className="text-yellow-600" />} color="bg-yellow-50" />
        <StatCard title="Suspended Tenants" value={t.SuspendedTenants || 0} icon={<XCircle size={20} className="text-red-600" />} color="bg-red-50" />
        <StatCard title="Pending Registrations" value={r.PendingRegistrations || 0} icon={<FileCheck size={20} className="text-orange-600" />} color="bg-orange-50" />
        <StatCard title="Trial Tenants" value={t.TrialTenants || 0} icon={<AlertTriangle size={20} className="text-cyan-600" />} color="bg-cyan-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tenants</h2>
          {dashboard.recentTenants?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentTenants.map((t: any) => (
                <div key={t.TenantID} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{t.TenantName}</p>
                    <p className="text-xs text-gray-500">{t.TenantCode}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.Status === 'Active' ? 'bg-green-100 text-green-700' :
                    t.Status === 'Suspended' ? 'bg-red-100 text-red-700' :
                    t.Status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{t.Status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No tenants yet.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Registrations</h2>
          {dashboard.recentRegistrations?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentRegistrations.map((r: any) => (
                <div key={r.RegistrationID} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{r.CompanyName || 'Pending Link'}</p>
                    <p className="text-xs text-gray-500">{r.ContactPerson} &middot; {r.ContactEmail}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    r.Status === 'Approved' ? 'bg-green-100 text-green-700' :
                    r.Status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    r.Status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{r.Status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No registrations yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
