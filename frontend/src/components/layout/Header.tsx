import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { tasksApi, importantDatesApi } from '../../services/api';
import { CompanySwitcher } from '../common/CompanySwitcher';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ tasks: any[]; dates: any[] }>({ tasks: [], dates: [] });
  const [isSearching, setIsSearching] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search effect
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const [tasksRes, datesRes] = await Promise.all([
            tasksApi.getTasks({ search: searchQuery, limit: 5 }),
            importantDatesApi.getImportantDates({ search: searchQuery, limit: 5 }),
          ]);
          setSearchResults({
            tasks: tasksRes.data || [],
            dates: datesRes.data || [],
          });
          setSearchOpen(true);
        } catch (err) {
          console.error('Search query failed:', err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults({ tasks: [], dates: [] });
        setSearchOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile menu toggle + Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Input */}
        <div ref={searchRef} className="relative w-full">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
              placeholder="Search tasks, dates, vendors, reference numbers..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 text-sm rounded-xl border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {searchResults.tasks.length === 0 && searchResults.dates.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No matching tasks or dates found.
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.tasks.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Tasks ({searchResults.tasks.length})
                      </div>
                      {searchResults.tasks.map((task) => (
                        <div
                          key={task.TaskID}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            navigate(`/tasks?highlight=${task.TaskID}`);
                          }}
                          className="px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-2">
                              {task.TaskNumber}
                            </span>
                            <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                              {task.TaskTitle}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {task.Status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.dates.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-500" /> Important Dates ({searchResults.dates.length})
                      </div>
                      {searchResults.dates.map((date) => (
                        <div
                          key={date.ImportantDateID}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            navigate(`/important-dates?highlight=${date.ImportantDateID}`);
                          }}
                          className="px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                              {date.Title}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {date.CategoryName} • {new Date(date.ExpiryDate || date.Date).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            {date.DaysRemaining !== undefined ? (date.DaysRemaining <= 0 ? 'Due Today' : `${date.DaysRemaining}d left`) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions: Company Switcher, Theme Toggle, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Multi-Tenant Company Switcher */}
        <CompanySwitcher />

        {/* Dark / Light Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="py-2 max-h-80 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No notifications yet. You're all caught up!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.NotificationID}
                      onClick={() => {
                        if (!n.IsRead) markAsRead(n.NotificationID);
                        if (n.ReferenceType === 'Task' && n.ReferenceID) {
                          setNotifOpen(false);
                          navigate(`/tasks?highlight=${n.ReferenceID}`);
                        } else if (n.ReferenceType === 'ImportantDate' && n.ReferenceID) {
                          setNotifOpen(false);
                          navigate(`/important-dates?highlight=${n.ReferenceID}`);
                        }
                      }}
                      className={`p-3 rounded-xl transition cursor-pointer flex items-start gap-3 ${
                        n.IsRead
                          ? 'bg-slate-50/50 dark:bg-slate-800/40 text-slate-500'
                          : 'bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-800 dark:text-slate-200 font-medium'
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.Type === 'TaskOverdue' ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        ) : n.Type === 'DateApproaching' ? (
                          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{n.Title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {n.Message}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {new Date(n.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
              {user?.employeeName?.charAt(0) || user?.username.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.employeeName || user?.username}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
                <span className="inline-block text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mt-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 rounded">
                  {user?.roleName}
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <UserIcon className="w-4 h-4" /> My Profile & Rules
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
