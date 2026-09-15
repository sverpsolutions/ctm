import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Save, Check } from 'lucide-react';
import { mastersApi } from '../../services/api';
import { Role, Permission } from '../../types';
import { Button } from '../common/Button';

export const RolesPermissionsTab: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<{ RoleID: number; PermissionID: number }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(4); // Default: Department Manager
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchSecurity = async () => {
    const res = await mastersApi.getRoles();
    if (res.data) {
      setRoles(res.data.roles || []);
      setPermissions(res.data.permissions || []);
      setRolePermissions(res.data.rolePermissions || []);
    }
  };

  useEffect(() => {
    fetchSecurity();
  }, []);

  const activeRolePermissionIds = rolePermissions
    .filter((rp) => rp.RoleID === selectedRoleId)
    .map((rp) => rp.PermissionID);

  const handleTogglePermission = (permId: number) => {
    if (selectedRoleId === 1) return; // Super admin always has all permissions

    const exists = activeRolePermissionIds.includes(permId);
    if (exists) {
      setRolePermissions(rolePermissions.filter((rp) => !(rp.RoleID === selectedRoleId && rp.PermissionID === permId)));
    } else {
      setRolePermissions([...rolePermissions, { RoleID: selectedRoleId, PermissionID: permId }]);
    }
  };

  const handleSaveRolePermissions = async () => {
    try {
      setIsSaving(true);
      await mastersApi.updateRolePermissions(selectedRoleId, activeRolePermissionIds);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save role permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Group permissions by Module
  const modules = Array.from(new Set(permissions.map((p) => p.ModuleName)));

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Role-Based Access Control (RBAC) Security Matrix
          </h3>
          <p className="text-xs text-slate-500">Configure module-level permissions and feature access for organizational roles</p>
        </div>

        <Button
          size="sm"
          onClick={handleSaveRolePermissions}
          isLoading={isSaving}
          disabled={selectedRoleId === 1}
          icon={savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
        >
          {savedSuccess ? 'Saved Matrix' : 'Save Role Matrix'}
        </Button>
      </div>

      {/* Role Picker Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {roles.map((r) => (
          <button
            key={r.RoleID}
            onClick={() => setSelectedRoleId(r.RoleID)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
              selectedRoleId === r.RoleID
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{r.RoleName}</span>
          </button>
        ))}
      </div>

      {/* Permissions Checkbox Grid by Module */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((moduleName) => {
          const modulePerms = permissions.filter((p) => p.ModuleName === moduleName);

          return (
            <div
              key={moduleName}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                {moduleName} Module
              </h4>

              <div className="space-y-2">
                {modulePerms.map((perm) => {
                  const isChecked = selectedRoleId === 1 || activeRolePermissionIds.includes(perm.PermissionID);

                  return (
                    <label
                      key={perm.PermissionID}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={selectedRoleId === 1}
                        onChange={() => handleTogglePermission(perm.PermissionID)}
                        className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 disabled:opacity-50"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                          {perm.Description || perm.PermissionCode}
                        </span>
                        <span className="text-[10px] text-slate-400">{perm.PermissionCode}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
