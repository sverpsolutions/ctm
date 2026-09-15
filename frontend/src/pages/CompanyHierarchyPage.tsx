import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { companiesApi, mastersApi } from '../services/api';
import { CompanyNode, Company, User } from '../types';
import {
  Building2,
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  Users,
  CheckSquare,
  Calendar,
  ShieldCheck,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderTree,
  UserPlus,
  ArrowRightLeft,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';

export const CompanyHierarchyPage: React.FC = () => {
  const { isSuperAdmin, activeCompanyId, switchCompany, refreshTenantData } = useTenant();
  const { user } = useAuth();

  const [treeData, setTreeData] = useState<CompanyNode[]>([]);
  const [flatCompanies, setFlatCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [parentCompanyIdForNew, setParentCompanyIdForNew] = useState<number | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    legalName: '',
    companyType: 'Subsidiary',
    parentCompanyId: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    subscriptionTier: 'Enterprise',
    maxUsers: 100,
    status: 'Active',
    enabledModules: ['tasks', 'dates', 'calendar', 'reports', 'audit'],
  });

  // User assignment modal state
  const [mappedUsers, setMappedUsers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [assignFormData, setAssignFormData] = useState({
    userId: '',
    roleId: '4',
    accessScope: 'Own',
    isPrimary: false,
  });

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      const [treeRes, flatRes] = await Promise.all([
        companiesApi.getCompanyTree(),
        companiesApi.getCompanies({ limit: 100 }),
      ]);
      setTreeData(treeRes.data || []);
      setFlatCompanies(flatRes.data || []);
    } catch (err) {
      console.error('Failed to load company hierarchy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  const openCreateModal = (parentId?: number) => {
    setParentCompanyIdForNew(parentId || null);
    setFormData({
      companyName: '',
      companyCode: '',
      legalName: '',
      companyType: parentId ? 'Branch' : 'Subsidiary',
      parentCompanyId: parentId ? String(parentId) : '',
      city: '',
      state: '',
      phone: '',
      email: '',
      gstin: '',
      pan: '',
      subscriptionTier: 'Enterprise',
      maxUsers: 100,
      status: 'Active',
      enabledModules: ['tasks', 'dates', 'calendar', 'reports', 'audit'],
    });
    setCreateModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setSelectedCompany(comp);
    setFormData({
      companyName: comp.CompanyName || '',
      companyCode: comp.CompanyCode || '',
      legalName: comp.LegalName || '',
      companyType: comp.CompanyType || 'Subsidiary',
      parentCompanyId: comp.ParentCompanyID ? String(comp.ParentCompanyID) : '',
      city: comp.City || '',
      state: comp.State || '',
      phone: comp.Phone || '',
      email: comp.Email || '',
      gstin: comp.GSTIN || '',
      pan: comp.PAN || '',
      subscriptionTier: comp.SubscriptionTier || 'Enterprise',
      maxUsers: comp.MaxUsers || 100,
      status: comp.Status || 'Active',
      enabledModules: comp.EnabledModules || ['tasks', 'dates', 'calendar', 'reports', 'audit'],
    });
    setEditModalOpen(true);
  };

  const openUsersModal = async (comp: Company) => {
    setSelectedCompany(comp);
    try {
      const [compDetails, usersRes] = await Promise.all([
        companiesApi.getCompanyById(comp.CompanyID),
        mastersApi.getUsers().catch(() => ({ data: [] })),
      ]);
      setMappedUsers(compDetails.data.mappedUsers || []);
      setAvailableUsers(usersRes.data || []);
      setUsersModalOpen(true);
    } catch (err) {
      console.error('Failed to load mapped users:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companiesApi.createCompany({
        ...formData,
        parentCompanyId: formData.parentCompanyId ? parseInt(formData.parentCompanyId, 10) : null,
      });
      setCreateModalOpen(false);
      await loadHierarchy();
      await refreshTenantData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create company.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await companiesApi.updateCompany(selectedCompany.CompanyID, {
        ...formData,
        parentCompanyId: formData.parentCompanyId ? parseInt(formData.parentCompanyId, 10) : null,
      });
      setEditModalOpen(false);
      await loadHierarchy();
      await refreshTenantData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update company.');
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !assignFormData.userId) return;
    try {
      await companiesApi.assignUserToCompany(selectedCompany.CompanyID, {
        userId: parseInt(assignFormData.userId, 10),
        roleId: parseInt(assignFormData.roleId, 10),
        accessScope: assignFormData.accessScope,
        isPrimary: assignFormData.isPrimary,
      });
      const compDetails = await companiesApi.getCompanyById(selectedCompany.CompanyID);
      setMappedUsers(compDetails.data.mappedUsers || []);
      setAssignFormData({ userId: '', roleId: '4', accessScope: 'Own', isPrimary: false });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign user.');
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!selectedCompany) return;
    if (!window.confirm('Are you sure you want to remove this user from the company?')) return;
    try {
      await companiesApi.removeUserFromCompany(selectedCompany.CompanyID, userId);
      const compDetails = await companiesApi.getCompanyById(selectedCompany.CompanyID);
      setMappedUsers(compDetails.data.mappedUsers || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove user.');
    }
  };

  const toggleModule = (moduleKey: string) => {
    setFormData((prev) => {
      const exists = prev.enabledModules.includes(moduleKey);
      return {
        ...prev,
        enabledModules: exists
          ? prev.enabledModules.filter((m) => m !== moduleKey)
          : [...prev.enabledModules, moduleKey],
      };
    });
  };

  const getCompanyTypeBadge = (type?: string) => {
    switch (type) {
      case 'Holding':
        return <Badge variant="purple">Holding Co.</Badge>;
      case 'Subsidiary':
        return <Badge variant="primary">Subsidiary</Badge>;
      case 'Branch':
        return <Badge variant="success">Branch</Badge>;
      case 'Joint Venture':
        return <Badge variant="warning">Joint Venture</Badge>;
      default:
        return <Badge variant="neutral">{type || 'Company'}</Badge>;
    }
  };

  // Render recursive tree node
  const renderTreeNode = (node: CompanyNode, depth = 0) => {
    const isNodeActive = node.CompanyID === activeCompanyId;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.CompanyID} className="relative">
        {/* Company Card in Tree */}
        <div
          className={`p-4 rounded-xl border transition-all mb-3 ${
            isNodeActive
              ? 'bg-primary-50/70 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800 shadow-md ring-1 ring-primary-400/40'
              : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
          }`}
          style={{ marginLeft: `${depth * 28}px` }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Info */}
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isNodeActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : node.CompanyType === 'Holding'
                    ? 'bg-purple-600 text-white'
                    : node.CompanyType === 'Branch'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                <Building2 className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {node.CompanyName}
                  </h4>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {node.CompanyCode}
                  </span>
                  {getCompanyTypeBadge(node.CompanyType)}
                  {isNodeActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-600 text-white">
                      ACTIVE TENANT
                    </span>
                  )}
                </div>

                {node.LegalName && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Legal Name: <span className="font-medium text-slate-700 dark:text-slate-300">{node.LegalName}</span>
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  {node.City && (
                    <span>
                      📍 {node.City}, {node.State}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <strong>{node.UserCount || 0}</strong> Users
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <strong>{node.TaskCount || 0}</strong> Tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                    <strong>{node.DateCount || 0}</strong> Important Dates
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    Tier: {node.SubscriptionTier || 'Enterprise'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
              {!isNodeActive && (
                <button
                  onClick={() => switchCompany(node.CompanyID)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Switch To Tenant
                </button>
              )}

              <button
                onClick={() => openCreateModal(node.CompanyID)}
                title="Add child company or branch under this organization"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" /> Add Child
              </button>

              <button
                onClick={() => openUsersModal(node)}
                title="Manage mapped users & roles"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5 text-blue-500" /> Users ({node.UserCount || 0})
              </button>

              <button
                onClick={() => openEditModal(node)}
                title="Edit Company Details"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Children Recursion */}
        {hasChildren && (
          <div className="space-y-1">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalHolding = flatCompanies.filter((c) => c.CompanyType === 'Holding').length;
  const totalSubsidiaries = flatCompanies.filter((c) => c.CompanyType === 'Subsidiary').length;
  const totalBranches = flatCompanies.filter((c) => c.CompanyType === 'Branch').length;
  const totalUsers = flatCompanies.reduce((acc, c) => acc + (c.UserCount || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderTree className="w-7 h-7 text-primary-500" />
            Company & Tenant Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage multi-company hierarchies, recursive subsidiaries, branch units, and tenant user mapping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => openCreateModal()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Root / Holding Company
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Companies</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{flatCompanies.length}</div>
          <span className="text-[11px] text-slate-500">Across entire platform</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Holding Groups</span>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalHolding}</div>
          <span className="text-[11px] text-slate-500">Independent root tenants</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subsidiaries & Branches</span>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalSubsidiaries + totalBranches}</div>
          <span className="text-[11px] text-slate-500">{totalSubsidiaries} Sub • {totalBranches} Branches</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Mapped Users</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalUsers}</div>
          <span className="text-[11px] text-slate-500">With discrete role scopes</span>
        </div>
      </div>

      {/* Main Hierarchy Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Organization Hierarchy Tree
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by company name or code..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-64"
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Loading multi-tenant hierarchy tree...
            </div>
          ) : treeData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No companies found. Click "Add Root / Holding Company" to create your first organization.
            </div>
          ) : (
            <div className="space-y-4">
              {treeData.map((rootNode) => renderTreeNode(rootNode))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE COMPANY MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={parentCompanyIdForNew ? 'Add Child Company / Branch' : 'Create New Holding Company'}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. ABC Hotel Dehradun"
            />
            <Input
              label="Company Code (Unique) *"
              required
              value={formData.companyCode}
              onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase() })}
              placeholder="e.g. HTL-DDN"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Legal / Registered Name"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              placeholder="Full registered entity name"
            />
            <Select
              label="Company Type *"
              value={formData.companyType}
              onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
              options={[
                { value: 'Holding', label: 'Holding Company (Top Level)' },
                { value: 'Subsidiary', label: 'Subsidiary Company' },
                { value: 'Branch', label: 'Branch / Store Unit' },
                { value: 'Joint Venture', label: 'Joint Venture' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Parent Organization"
              value={formData.parentCompanyId}
              onChange={(e) => setFormData({ ...formData, parentCompanyId: e.target.value })}
              options={[
                { value: '', label: 'None (Root / Holding Company)' },
                ...flatCompanies.map((c) => ({
                  value: String(c.CompanyID),
                  label: `${c.CompanyName} (${c.CompanyCode})`,
                })),
              ]}
            />
            <Select
              label="Subscription Tier"
              value={formData.subscriptionTier}
              onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
              options={[
                { value: 'Enterprise', label: 'Enterprise (Unlimited)' },
                { value: 'Professional', label: 'Professional (Up to 100 users)' },
                { value: 'Standard', label: 'Standard (Up to 30 users)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Dehradun"
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="e.g. Uttarakhand"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@company.com"
            />
            <Input
              label="Contact Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98200 11223"
            />
          </div>

          {/* Module Licensing */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Enabled Modules / Feature Licensing:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'tasks', label: 'Task Management' },
                { key: 'dates', label: 'Important Dates' },
                { key: 'calendar', label: 'Master Calendar' },
                { key: 'reports', label: 'Reports & Analytics' },
                { key: 'audit', label: 'Audit Trail' },
              ].map((mod) => (
                <label
                  key={mod.key}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={formData.enabledModules.includes(mod.key)}
                    onChange={() => toggleModule(mod.key)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{mod.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Company</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT COMPANY MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Company: ${selectedCompany?.CompanyName}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
            <Input
              label="Company Code"
              disabled
              value={formData.companyCode}
              placeholder="Company code is immutable"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Legal Name"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Suspended', label: 'Suspended' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Parent Organization"
              value={formData.parentCompanyId}
              onChange={(e) => setFormData({ ...formData, parentCompanyId: e.target.value })}
              options={[
                { value: '', label: 'None (Root Holding Company)' },
                ...flatCompanies
                  .filter((c) => c.CompanyID !== selectedCompany?.CompanyID)
                  .map((c) => ({
                    value: String(c.CompanyID),
                    label: `${c.CompanyName} (${c.CompanyCode})`,
                  })),
              ]}
            />
            <Select
              label="Subscription Tier"
              value={formData.subscriptionTier}
              onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
              options={[
                { value: 'Enterprise', label: 'Enterprise (Unlimited)' },
                { value: 'Professional', label: 'Professional (Up to 100 users)' },
                { value: 'Standard', label: 'Standard (Up to 30 users)' },
              ]}
            />
          </div>

          {/* Module Licensing */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Enabled Modules / Feature Licensing:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'tasks', label: 'Task Management' },
                { key: 'dates', label: 'Important Dates' },
                { key: 'calendar', label: 'Master Calendar' },
                { key: 'reports', label: 'Reports & Analytics' },
                { key: 'audit', label: 'Audit Trail' },
              ].map((mod) => (
                <label
                  key={mod.key}
                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={formData.enabledModules.includes(mod.key)}
                    onChange={() => toggleModule(mod.key)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{mod.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* USER COMPANY MAPPING MODAL */}
      <Modal
        isOpen={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
        title={`Mapped Users: ${selectedCompany?.CompanyName}`}
      >
        <div className="space-y-4">
          {/* Add User Form */}
          <form onSubmit={handleAssignUser} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-primary-500" /> Assign User To This Company
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Select
                label="User Account"
                value={assignFormData.userId}
                onChange={(e) => setAssignFormData({ ...assignFormData, userId: e.target.value })}
                options={[
                  { value: '', label: 'Select User...' },
                  ...availableUsers.map((u) => ({
                    value: String(u.userId || u.UserID),
                    label: `${u.username || u.Username} (${u.roleName || u.RoleName})`,
                  })),
                ]}
              />
              <Select
                label="Assigned Role"
                value={assignFormData.roleId}
                onChange={(e) => setAssignFormData({ ...assignFormData, roleId: e.target.value })}
                options={[
                  { value: '1', label: 'Super Admin' },
                  { value: '2', label: 'Group Admin' },
                  { value: '3', label: 'Company Head' },
                  { value: '4', label: 'Department Manager' },
                  { value: '5', label: 'Employee' },
                  { value: '6', label: 'Viewer' },
                ]}
              />
              <Select
                label="Access Scope"
                value={assignFormData.accessScope}
                onChange={(e) => setAssignFormData({ ...assignFormData, accessScope: e.target.value })}
                options={[
                  { value: 'Own', label: 'Level 1: Own Company Only' },
                  { value: 'Hierarchy', label: 'Level 2: Rollup + Child Branches' },
                  { value: 'Global', label: 'Level 4: Global SuperAdmin' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={assignFormData.isPrimary}
                  onChange={(e) => setAssignFormData({ ...assignFormData, isPrimary: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                Set as user's primary company
              </label>
              <Button type="submit" size="sm">
                Assign User
              </Button>
            </div>
          </form>

          {/* Mapped Users Table */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750">
            {mappedUsers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No users explicitly mapped to this company yet.
              </div>
            ) : (
              mappedUsers.map((u) => (
                <div key={u.UserCompanyID || u.UserID} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {u.Username || u.Email}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Role: <strong className="text-slate-700 dark:text-slate-300">{u.RoleName}</strong></span>
                      <span>•</span>
                      <span>Scope: <strong className="text-primary-600 dark:text-primary-400">{u.AccessScope}</strong></span>
                      {u.IsPrimary ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          Primary
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveUser(u.UserID)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Remove access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
