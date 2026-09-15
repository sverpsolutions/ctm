import React, { useState, useEffect, useCallback } from 'react';
import { platformApi } from '../services/api';
import { Tenant } from '../types';
import { Building2, Search, Plus, Eye, Pause, Play, Key, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Tenant | null>(null);
  const [showResetPw, setShowResetPw] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    TenantCode: '', TenantName: '', LegalName: '', ContactPerson: '', ContactEmail: '',
    ContactMobile: '', Industry: '', Address: '', City: '', State: '', Country: 'India',
    PINCode: '', Website: '', GSTIN: '', PAN: '', SubscriptionTier: 'Standard',
    MaxCompanies: 5, MaxUsers: 50,
  });

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformApi.getTenants({ search, status: statusFilter, page, limit: 15 });
      setTenants(data.tenants || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await platformApi.createTenant(form as any);
      setShowCreate(false);
      setForm({ TenantCode: '', TenantName: '', LegalName: '', ContactPerson: '', ContactEmail: '', ContactMobile: '', Industry: '', Address: '', City: '', State: '', Country: 'India', PINCode: '', Website: '', GSTIN: '', PAN: '', SubscriptionTier: 'Standard', MaxCompanies: 5, MaxUsers: 50 });
      loadTenants();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = async (id: number) => {
    if (!confirm('Suspend this tenant? Their users will be unable to login.')) return;
    setActionLoading(true);
    try {
      await platformApi.suspendTenant(id);
      loadTenants();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to suspend');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id: number) => {
    setActionLoading(true);
    try {
      await platformApi.activateTenant(id);
      loadTenants();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to activate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPw || !newPassword) return;
    if (newPassword.length < 8) { alert('Password must be at least 8 characters'); return; }
    setActionLoading(true);
    try {
      await platformApi.resetTenantAdminPassword(showResetPw, newPassword);
      alert('Password reset successfully. User will be required to change it on next login.');
      setShowResetPw(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const viewDetail = async (id: number) => {
    try {
      const data = await platformApi.getTenantById(id);
      setShowDetail(data.tenant);
    } catch (err) {
      console.error('Failed to load tenant detail:', err);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Active: 'bg-green-100 text-green-700', Suspended: 'bg-red-100 text-red-700',
      Pending: 'bg-yellow-100 text-yellow-700', Trial: 'bg-blue-100 text-blue-700',
      Expired: 'bg-gray-100 text-gray-700', Cancelled: 'bg-gray-200 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer organizations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={16} /> Create Tenant
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search tenants..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Trial">Trial</option>
          <option value="Suspended">Suspended</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-50" />
            <p>No tenants found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Companies</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Users</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Tier</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map(t => (
                  <tr key={t.TenantID} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.TenantName}</p>
                      <p className="text-xs text-gray-500">{t.TenantCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{t.ContactPerson}</p>
                      <p className="text-xs text-gray-500">{t.ContactEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{t.CompanyCount ?? 0}</td>
                    <td className="px-4 py-3 text-center">{t.UserCount ?? 0}</td>
                    <td className="px-4 py-3 text-center">{t.SubscriptionTier}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(t.Status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewDetail(t.TenantID)} title="View Details" className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                          <Eye size={16} />
                        </button>
                        {t.Status === 'Active' ? (
                          <button onClick={() => handleSuspend(t.TenantID)} title="Suspend" disabled={actionLoading} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                            <Pause size={16} />
                          </button>
                        ) : t.Status === 'Suspended' ? (
                          <button onClick={() => handleActivate(t.TenantID)} title="Activate" disabled={actionLoading} className="p-1.5 text-gray-400 hover:text-green-600 rounded">
                            <Play size={16} />
                          </button>
                        ) : null}
                        <button onClick={() => setShowResetPw(t.TenantID)} title="Reset Admin Password" className="p-1.5 text-gray-400 hover:text-orange-600 rounded">
                          <Key size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Create Tenant</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Code *</label>
                  <input required value={form.TenantCode} onChange={e => setForm(f => ({ ...f, TenantCode: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="ABC-CORP" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Name *</label>
                  <input required value={form.TenantName} onChange={e => setForm(f => ({ ...f, TenantName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                  <input value={form.LegalName} onChange={e => setForm(f => ({ ...f, LegalName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                  <input required value={form.ContactPerson} onChange={e => setForm(f => ({ ...f, ContactPerson: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                  <input required type="email" value={form.ContactEmail} onChange={e => setForm(f => ({ ...f, ContactEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Mobile</label>
                  <input value={form.ContactMobile} onChange={e => setForm(f => ({ ...f, ContactMobile: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input value={form.Industry} onChange={e => setForm(f => ({ ...f, Industry: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                  <select value={form.SubscriptionTier} onChange={e => setForm(f => ({ ...f, SubscriptionTier: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Standard</option><option>Professional</option><option>Enterprise</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input value={form.Address} onChange={e => setForm(f => ({ ...f, Address: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input value={form.City} onChange={e => setForm(f => ({ ...f, City: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input value={form.State} onChange={e => setForm(f => ({ ...f, State: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input value={form.GSTIN} onChange={e => setForm(f => ({ ...f, GSTIN: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input value={form.PAN} onChange={e => setForm(f => ({ ...f, PAN: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Companies</label>
                  <input type="number" value={form.MaxCompanies} onChange={e => setForm(f => ({ ...f, MaxCompanies: parseInt(e.target.value) || 5 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                  <input type="number" value={form.MaxUsers} onChange={e => setForm(f => ({ ...f, MaxUsers: parseInt(e.target.value) || 50 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{showDetail.TenantName}</h2>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Code:</span> <span className="font-medium">{showDetail.TenantCode}</span></div>
                <div><span className="text-gray-500">Status:</span> {statusBadge(showDetail.Status)}</div>
                <div><span className="text-gray-500">Contact:</span> {showDetail.ContactPerson}</div>
                <div><span className="text-gray-500">Email:</span> {showDetail.ContactEmail}</div>
                <div><span className="text-gray-500">Mobile:</span> {showDetail.ContactMobile || '-'}</div>
                <div><span className="text-gray-500">Industry:</span> {showDetail.Industry || '-'}</div>
                <div><span className="text-gray-500">Tier:</span> {showDetail.SubscriptionTier}</div>
                <div><span className="text-gray-500">Max Companies:</span> {showDetail.MaxCompanies}</div>
                <div><span className="text-gray-500">Max Users:</span> {showDetail.MaxUsers}</div>
                <div><span className="text-gray-500">Companies:</span> {showDetail.CompanyCount ?? 0}</div>
                <div><span className="text-gray-500">Users:</span> {showDetail.UserCount ?? 0}</div>
                <div><span className="text-gray-500">GSTIN:</span> {showDetail.GSTIN || '-'}</div>
                <div><span className="text-gray-500">PAN:</span> {showDetail.PAN || '-'}</div>
                <div><span className="text-gray-500">Address:</span> {[showDetail.Address, showDetail.City, showDetail.State].filter(Boolean).join(', ') || '-'}</div>
                <div><span className="text-gray-500">Created:</span> {new Date(showDetail.CreatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Reset Tenant Admin Password</h2>
              <button onClick={() => { setShowResetPw(null); setNewPassword(''); }} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Enter a new password for the tenant's admin user. They will be required to change it on next login.</p>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowResetPw(null); setNewPassword(''); }} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleResetPassword} disabled={actionLoading || !newPassword} className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50">
                  {actionLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
