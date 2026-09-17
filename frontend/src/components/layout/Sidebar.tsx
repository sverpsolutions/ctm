import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  CalendarClock,
  BarChart3,
  Users,
  Settings,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  FolderTree,
  X,
  Globe,
  FileCheck,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { clsx } from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, logout, hasPermission, isPlatformAdmin } = useAuth();
  const { isModuleEnabled, isSuperAdmin } = useTenant();
  const navigate = useNavigate();

  const isPlatAdmin = isPlatformAdmin();
  const isGroupOrSuperAdmin = isSuperAdmin || user?.roleName === 'Group Admin' || user?.roleName === 'Company Admin';

  const platformNavItems = [
    { to: '/platform/dashboard', label: 'Platform Dashboard', icon: <Globe className="w-5 h-5" />, allowed: true },
    { to: '/platform/tenants', label: 'Tenants', icon: <Building2 className="w-5 h-5" />, allowed: true },
    { to: '/platform/registrations', label: 'Registrations', icon: <FileCheck className="w-5 h-5" />, allowed: true },
    { to: '/platform/users', label: 'All Users', icon: <UserCog className="w-5 h-5" />, allowed: true },
  ];

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      allowed: true,
    },
    {
      to: '/companies',
      label: 'Companies & Hierarchy',
      icon: <FolderTree className="w-5 h-5 text-indigo-500" />,
      allowed: isGroupOrSuperAdmin || hasPermission('masters.manage'),
    },
    {
      to: '/tasks',
      label: 'Tasks & Workflow',
      icon: <CheckSquare className="w-5 h-5" />,
      allowed: isModuleEnabled('tasks') && hasPermission('tasks.view'),
    },
    {
      to: '/important-dates',
      label: 'Important Dates',
      icon: <CalendarClock className="w-5 h-5" />,
      allowed: isModuleEnabled('dates') && hasPermission('dates.view'),
    },
    {
      to: '/calendar',
      label: 'Calendar',
      icon: <Calendar className="w-5 h-5" />,
      allowed: isModuleEnabled('calendar'),
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      allowed: isModuleEnabled('reports') && hasPermission('reports.view'),
    },
    {
      to: '/masters',
      label: 'Masters & Staff',
      icon: <Users className="w-5 h-5" />,
      allowed: hasPermission('masters.manage'),
    },
    {
      to: '/user-company-rights',
      label: 'User Company Rights',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      allowed: isGroupOrSuperAdmin || hasPermission('masters.manage'),
    },
    {
      to: '/audit-logs',
      label: 'Audit History',
      icon: <ShieldAlert className="w-5 h-5" />,
      allowed: isModuleEnabled('audit') && hasPermission('audit.view'),
    },
    {
      to: '/settings',
      label: 'Settings & Rules',
      icon: <Settings className="w-5 h-5" />,
      allowed: hasPermission('settings.manage'),
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          {(!isCollapsed || mobileOpen) && (
            <div className="overflow-hidden">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight block truncate">
                {isPlatAdmin ? 'SV ERP Platform' : (user?.companyName || 'ApexCorp')}
              </span>
              <span className={`text-[11px] font-medium block tracking-wider uppercase ${isPlatAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {isPlatAdmin ? 'Platform Admin' : 'Task & Date Hub'}
              </span>
            </div>
          )}
        </div>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {isPlatAdmin && (
          <>
            {(!isCollapsed || mobileOpen) && (
              <div className="px-3.5 pt-1 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400">Platform</span>
              </div>
            )}
            {platformNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 font-semibold shadow-sm shadow-purple-100 dark:shadow-none'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0 transition-transform group-hover:scale-105">{item.icon}</span>
                {(!isCollapsed || mobileOpen) && <span>{item.label}</span>}
              </NavLink>
            ))}
            {(!isCollapsed || mobileOpen) && (
              <div className="px-3.5 pt-4 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Tenant View</span>
              </div>
            )}
          </>
        )}
        {navItems
          .filter((item) => item.allowed)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm shadow-indigo-100 dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0 transition-transform group-hover:scale-105">
                {item.icon}
              </span>
              {(!isCollapsed || mobileOpen) && <span>{item.label}</span>}
            </NavLink>
          ))}
      </div>

      {/* User Profile & Collapse Toggle */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs flex-shrink-0 uppercase">
              {user?.employeeName?.substring(0, 2) || 'US'}
            </div>
            {(!isCollapsed || mobileOpen) && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.employeeName || user?.username}
                </p>
                <span className="inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 truncate">
                  {user?.roleName}
                </span>
              </div>
            )}
          </div>
          {(!isCollapsed || mobileOpen) && (
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <div className="hidden lg:flex justify-end mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition w-full flex items-center justify-center"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <ChevronLeft className="w-4 h-4" /> Collapse
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          'hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
