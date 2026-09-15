import React, { useState, useEffect, useCallback } from 'react';
import { platformApi } from '../services/api';
import { TenantRegistration } from '../types';
import { FileCheck, Search, Link2, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, X, Copy, Clock } from 'lucide-react';

export default function PlatformRegistrationsPage() {
  const [registrations, setRegistrations] = useState<TenantRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [showDetail, setShowDetail] = useState<TenantRegistration | null>(null);
  const [showReject, setShowReject] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [linkResult, setLinkResult] = useState<{ link: string; expiresAt: string } | null>(null);
  const [linkForm, setLinkForm] = useState({ expiresInDays: 7, notes: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformApi.getRegistrations({ status: statusFilter, page, limit: 15 });
      setRegistrations(data.registrations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load registrations:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { loadRegistrations(); }, [loadRegistrations]);

  const handleCreateLink = async () => {
    setActionLoading(true);
    try {
      const data = await platformApi.createRegistrationLink(linkForm);
      setLinkResult({ link: data.registrationUrl, expiresAt: data.expiresAt });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this registration? This will create a new tenant, company, and admin user.')) return;
    setActionLoading(true);
    try {
      await platformApi.approveRegistration(id);
      loadRegistrations();
      setShowDetail(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!showReject || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await platformApi.rejectRegistration(showReject, rejectReason);
      setShowReject(null);
      setRejectReason('');
      loadRegistrations();
      setShowDetail(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const viewDetail = async (id: number) => {
    try {
      const data = await platformApi.getRegistrationById(id);
      setShowDetail(data.registration);
    } catch (err) {
      console.error('Failed to load registration detail:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      LinkGenerated: 'bg-blue-100 text-blue-700', Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700',
      Expired: 'bg-gray-100 text-gray-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registrations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer registration links and applications</p>
        </div>
        <button onClick={() => { setShowCreateLink(true); setLinkResult(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Link2 size={16} /> Generate Link
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          <option value="LinkGenerated">Link Generated</option>
          <option value="Pending">Pending Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileCheck size={40} className="mx-auto mb-3 opacity-50" />
            <p>No registrations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Admin</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations.map(r => (
                  <tr key={r.RegistrationID} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.CompanyName || '(Awaiting submission)'}</p>
                      <p className="text-xs text-gray-500">{r.Industry || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{r.ContactPerson || '-'}</p>
                      <p className="text-xs text-gray-500">{r.ContactEmail || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{r.AdminUsername || '-'}</p>
                      <p className="text-xs text-gray-500">{r.AdminEmail || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(r.Status)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(r.CreatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewDetail(r.RegistrationID)} title="View Details" className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                          <Eye size={16} />
                        </button>
                        {r.Status === 'Pending' && (
                          <>
                            <button onClick={() => handleApprove(r.RegistrationID)} title="Approve" disabled={actionLoading} className="p-1.5 text-gray-400 hover:text-green-600 rounded">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={() => setShowReject(r.RegistrationID)} title="Reject" className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
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

      {/* Create Link Modal */}
      {showCreateLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Generate Registration Link</h2>
              <button onClick={() => setShowCreateLink(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {!linkResult ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Expiry (days)</label>
                    <input type="number" min={1} max={30} value={linkForm.expiresInDays} onChange={e => setLinkForm(f => ({ ...f, expiresInDays: parseInt(e.target.value) || 7 }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea value={linkForm.notes} onChange={e => setLinkForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Internal notes about this registration link" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowCreateLink(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleCreateLink} disabled={actionLoading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {actionLoading ? 'Generating...' : 'Generate Link'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 mb-2">Registration link created!</p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={linkResult.link} className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-xs font-mono" />
                      <button onClick={() => copyToClipboard(linkResult.link)} className="p-2 bg-green-600 text-white rounded hover:bg-green-700" title="Copy link">
                        <Copy size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <Clock size={12} /> Expires: {new Date(linkResult.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => { setShowCreateLink(false); loadRegistrations(); }} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Done</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Registration Detail</h2>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900">{showDetail.CompanyName || '(Awaiting submission)'}</h3>
                {statusBadge(showDetail.Status)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Contact Person:</span> {showDetail.ContactPerson || '-'}</div>
                <div><span className="text-gray-500">Contact Email:</span> {showDetail.ContactEmail || '-'}</div>
                <div><span className="text-gray-500">Contact Mobile:</span> {showDetail.ContactMobile || '-'}</div>
                <div><span className="text-gray-500">Industry:</span> {showDetail.Industry || '-'}</div>
                <div><span className="text-gray-500">Company Type:</span> {showDetail.CompanyType || '-'}</div>
                <div><span className="text-gray-500">Num Branches:</span> {showDetail.NumBranches || '-'}</div>
                <div><span className="text-gray-500">Num Users:</span> {showDetail.NumUsers || '-'}</div>
                <div><span className="text-gray-500">GSTIN:</span> {showDetail.GSTIN || '-'}</div>
                <div><span className="text-gray-500">Admin Name:</span> {showDetail.AdminName || '-'}</div>
                <div><span className="text-gray-500">Admin Username:</span> {showDetail.AdminUsername || '-'}</div>
                <div><span className="text-gray-500">Admin Email:</span> {showDetail.AdminEmail || '-'}</div>
                <div><span className="text-gray-500">Token Expires:</span> {showDetail.TokenExpiresAt ? new Date(showDetail.TokenExpiresAt).toLocaleString() : '-'}</div>
                {showDetail.Address && <div className="col-span-2"><span className="text-gray-500">Address:</span> {[showDetail.Address, showDetail.City, showDetail.State, showDetail.Country].filter(Boolean).join(', ')}</div>}
                {showDetail.Notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {showDetail.Notes}</div>}
                {showDetail.RejectionReason && <div className="col-span-2"><span className="text-gray-500">Rejection Reason:</span> <span className="text-red-600">{showDetail.RejectionReason}</span></div>}
              </div>
              {showDetail.Status === 'Pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button onClick={() => setShowReject(showDetail.RegistrationID)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Reject</button>
                  <button onClick={() => handleApprove(showDetail.RegistrationID)} disabled={actionLoading} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {actionLoading ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Reject Registration</h2>
              <button onClick={() => { setShowReject(null); setRejectReason(''); }} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Explain why this registration is being rejected" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowReject(null); setRejectReason(''); }} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {actionLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
