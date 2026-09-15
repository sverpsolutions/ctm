import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Building2, ChevronDown, Check, Search, Layers, ShieldCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CompanySwitcher: React.FC = () => {
  const { activeCompany, accessibleCompanies, activeCompanyId, switchCompany, isSuperAdmin } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = accessibleCompanies.filter(
    (c) =>
      c.CompanyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.CompanyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.CompanyType && c.CompanyType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (companyId: number) => {
    switchCompany(companyId);
    setIsOpen(false);
  };

  const getCompanyTypeBadge = (type: string) => {
    switch (type) {
      case 'Holding':
        return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Subsidiary':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Branch':
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      >
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="text-left hidden sm:block max-w-[200px] lg:max-w-[260px] truncate">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {activeCompany ? activeCompany.CompanyName : 'Select Company'}
            </span>
            {activeCompany?.CompanyCode && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {activeCompany.CompanyCode}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {activeCompany?.CompanyType || 'Organization'} •{' '}
            <span className="text-primary-600 dark:text-primary-400 font-semibold">
              {isSuperAdmin ? 'Global Access' : 'Active Tenant'}
            </span>
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary-500" />
                Switch Active Company
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                {accessibleCompanies.length} Accessible
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                autoFocus
              />
            </div>
          </div>

          {/* Companies List */}
          <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-slate-100 dark:divide-slate-750">
            {filteredCompanies.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No companies match your search.
              </div>
            ) : (
              filteredCompanies.map((c) => {
                const isSelected = c.CompanyID === activeCompanyId;
                return (
                  <button
                    key={c.CompanyID}
                    onClick={() => handleSelect(c.CompanyID)}
                    className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-primary-50/80 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {c.CompanyName}
                          </span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            {c.CompanyCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getCompanyTypeBadge(c.CompanyType)}`}>
                            {c.CompanyType}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Scope: <strong className="text-slate-700 dark:text-slate-300">{c.AccessScope}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {isSuperAdmin && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Super Admin Mode
              </span>
              <Link
                to="/companies"
                onClick={() => setIsOpen(false)}
                className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:underline text-[11px]"
              >
                Manage Hierarchy <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
