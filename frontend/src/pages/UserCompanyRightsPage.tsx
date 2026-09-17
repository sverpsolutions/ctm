import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Search,
  CheckSquare,
  Square,
  Save,
  AlertCircle,
  CheckCircle2,
  Filter,
  UserCheck,
  ChevronRight,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { userCompanyRightsApi } from '../services/api';
import { UserCompanyRightsUser, CompanyRightItem } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const UserCompanyRightsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { refreshTenantData } = useTenant();

  // State
  const [users, setUsers] = useState<UserCompanyRightsUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserCompanyRightsUser | null>(null);
  const [companies, setCompanies] = useState<CompanyRightItem[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [primaryCompanyId, setPrimaryCompanyId] = useState<number | null>(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');

  // Status & Feedback
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingRights, setIsLoadingRights] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Users on Mount
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setErrorMessage(null);
      const res = await userCompanyRightsApi.getUsers();
      const list = res.data || [];
      setUsers(list);

      // Default select first non-admin or first user if none selected
      if (list.length > 0 && !selectedUserId) {
        const defaultUser = list.find((u) => u.RoleName === 'Employee') || list[0];
        setSelectedUserId(defaultUser.UserID);
        setSelectedUser(defaultUser);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load users directory.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch company rights when selected user changes
  useEffect(() => {
    if (!selectedUserId) return;

    const fetchRights = async () => {
      try {
        setIsLoadingRights(true);
        setSaveSuccessMsg(null);
        setErrorMessage(null);

        const res = await userCompanyRightsApi.getUserRights(selectedUserId);
        const data = res.data;
        if (data) {
          setCompanies(data.companies || []);

          const assigned = data.companies.filter((c) => c.isAssigned).map((c) => c.companyId);
          setSelectedCompanyIds(assigned);

          const primary = data.companies.find((c) => c.isPrimary);
          setPrimaryCompanyId(primary ? primary.companyId : data.user.primaryCompanyId || (assigned[0] ?? null));
        }
      } catch (err: any) {
        console.error('Failed to load user company rights:', err);
        setErrorMessage(err.response?.data?.message || 'Failed to load user company permissions.');
      } finally {
        setIsLoadingRights(false);
      }
    };

    fetchRights();
  }, [selectedUserId]);

  const handleSelectUser = (u: UserCompanyRightsUser) => {
    setSelectedUserId(u.UserID);
    setSelectedUser(u);
    setSaveSuccessMsg(null);
    setErrorMessage(null);
  };

  // Toggle single company checkbox
  const handleToggleCompany = (companyId: number) => {
    setSelectedCompanyIds((prev) => {
      let updated: number[];
      if (prev.includes(companyId)) {
        updated = prev.filter((id) => id !== companyId);
        // If unchecking primary company, shift primary to another selected company
        if (primaryCompanyId === companyId) {
          setPrimaryCompanyId(updated[0] || null);
        }
      } else {
        updated = [...prev, companyId];
        // If no primary set, default to this one
        if (!primaryCompanyId) {
          setPrimaryCompanyId(companyId);
        }
      }
      return updated;
    });
  };

  // Select All companies
  const handleSelectAll = () => {
    const allIds = companies.map((c) => c.companyId);
    setSelectedCompanyIds(allIds);
    if (!primaryCompanyId && allIds.length > 0) {
      setPrimaryCompanyId(allIds[0]);
    }
  };

  // Clear All companies
  const handleClearAll = () => {
    setSelectedCompanyIds([]);
    setPrimaryCompanyId(null);
  };

  // Set Primary Company
  const handleSetPrimary = (companyId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Ensure company is also checked
    if (!selectedCompanyIds.includes(companyId)) {
      setSelectedCompanyIds((prev) => [...prev, companyId]);
    }
    setPrimaryCompanyId(companyId);
  };

  // Save Rights
  const handleSaveRights = async () => {
    if (!selectedUserId) return;

    try {
      setIsSaving(true);
      setSaveSuccessMsg(null);
      setErrorMessage(null);

      const payload = {
        companyIds: selectedCompanyIds,
        primaryCompanyId: primaryCompanyId || (selectedCompanyIds[0] ?? undefined),
      };

      const res = await userCompanyRightsApi.saveUserRights(selectedUserId, payload);
      setSaveSuccessMsg(res.message || 'Company access rights saved successfully.');

      // Refresh local user count
      setUsers((prev) =>
        prev.map((u) =>
          u.UserID === selectedUserId
            ? {
                ...u,
                AssignedCompanyCount: selectedCompanyIds.length,
                PrimaryCompanyID: primaryCompanyId || u.PrimaryCompanyID,
              }
            : u
        )
      );

      // If updating the currently logged-in user, refresh the tenant context
      if (currentUser?.userId === selectedUserId) {
        await refreshTenantData();
      }
    } catch (err: any) {
      console.error('Failed to save company rights:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save company access rights.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const query = userSearch.toLowerCase();
    return (
      u.Username.toLowerCase().includes(query) ||
      (u.EmployeeName && u.EmployeeName.toLowerCase().includes(query)) ||
      u.Email.toLowerCase().includes(query) ||
      u.RoleName.toLowerCase().includes(query)
    );
  });

  const filteredCompanies = companies.filter((c) => {
    const query = companySearch.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(query) ||
      c.companyCode.toLowerCase().includes(query) ||
      (c.legalName && c.legalName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Multi-Company Security & Access Control</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            User Company Rights Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure single-company, multi-company, or organization-wide task access on a per-user basis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={isLoadingUsers}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: User Directory Selector (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-sm">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Select User</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
              {filteredUsers.length} Users
            </span>
          </div>

          {/* User Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user by name, email, or role..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition"
            />
          </div>

          {/* User List */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {isLoadingUsers ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-indigo-500" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No users found matching "{userSearch}".
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = u.UserID === selectedUserId;
                return (
                  <button
                    key={u.UserID}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between border ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-sm'
                        : 'bg-white dark:bg-slate-900/40 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs flex-shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {u.EmployeeName
                          ? u.EmployeeName.substring(0, 2).toUpperCase()
                          : u.Username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected
                                ? 'text-indigo-950 dark:text-indigo-200'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {u.EmployeeName || u.Username}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate block">
                          {u.Email}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {u.RoleName}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              u.AssignedCompanyCount > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {u.AssignedCompanyCount}{' '}
                            {u.AssignedCompanyCount === 1 ? 'Company' : 'Companies'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Company Rights Matrix (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-6">
          {/* Selected User Header Card */}
          {selectedUser ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                  {selectedUser.EmployeeName
                    ? selectedUser.EmployeeName.substring(0, 2).toUpperCase()
                    : selectedUser.Username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      User: {selectedUser.EmployeeName || selectedUser.Username}
                    </h3>
                    <Badge variant="purple">{selectedUser.RoleName}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedUser.Email} {selectedUser.Designation ? `• ${selectedUser.Designation}` : ''}
                  </p>
                </div>
              </div>

              {/* Statistics Chips */}
              <div className="flex items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Assigned</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {selectedCompanyIds.length} / {companies.length}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Primary</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[100px] block">
                    {companies.find((c) => c.companyId === primaryCompanyId)?.companyCode || 'None'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-slate-400">
              Please select a user from the left column to configure company access rights.
            </div>
          )}

          {/* Action Toolbar: Select All, Clear All, Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mr-1">
                Company Access:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={companies.length === 0}
                className="text-xs flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedCompanyIds.length === 0}
                className="text-xs flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                Clear All
              </Button>
            </div>

            {/* Filter Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter company list..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Companies Checklist */}
          {isLoadingRights ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-500" />
              Loading company rights matrix...
            </div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No active companies found in the system.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredCompanies.map((comp) => {
                const isChecked = selectedCompanyIds.includes(comp.companyId);
                const isPrimary = primaryCompanyId === comp.companyId;

                return (
                  <div
                    key={comp.companyId}
                    onClick={() => handleToggleCompany(comp.companyId)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                      isChecked
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                        : 'bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Checkbox & Company Meta */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition flex-shrink-0 ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold truncate ${
                              isChecked
                                ? 'text-slate-900 dark:text-slate-100'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {comp.companyName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                            {comp.companyCode}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {comp.companyType}
                          </span>
                        </div>
                        {comp.parentCompanyName && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Subsidiary of {comp.parentCompanyName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: Primary Company Designation */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isPrimary ? (
                        <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white shadow-xs">
                          ★ Primary Company
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleSetPrimary(comp.companyId, e)}
                          className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-lg border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Guidelines Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold">Role & Access Scope Enforcement</p>
              <p className="opacity-90 mt-0.5">
                Tasks created by or assigned to this user will strictly respect the checked companies.
                Unauthorized company tasks are blocked at both UI and API levels with 403 Forbidden.
              </p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedCompanyIds.length} of {companies.length} companies selected
            </span>

            <Button
              type="button"
              onClick={handleSaveRights}
              isLoading={isSaving}
              disabled={isSaving || !selectedUserId}
              className="px-6 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Rights
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
