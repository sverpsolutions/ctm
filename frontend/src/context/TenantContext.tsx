import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Company, CompanyNode, UserCompanyAccess } from '../types';
import { companiesApi } from '../services/api';
import { useAuth } from './AuthContext';

interface TenantContextType {
  activeCompanyId: number | null;
  activeCompany: Company | null;
  accessibleCompanies: UserCompanyAccess[];
  companyTree: CompanyNode[];
  isSuperAdmin: boolean;
  isLoadingTenant: boolean;
  switchCompany: (companyId: number) => Promise<void>;
  isModuleEnabled: (moduleName: string) => boolean;
  refreshTenantData: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(() => {
    const saved = localStorage.getItem('active_company_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [accessibleCompanies, setAccessibleCompanies] = useState<UserCompanyAccess[]>([]);
  const [companyTree, setCompanyTree] = useState<CompanyNode[]>([]);
  const [isLoadingTenant, setIsLoadingTenant] = useState<boolean>(true);

  const isSuperAdmin = user?.roleName === 'Super Admin';

  const fetchTenantData = useCallback(async () => {
    if (!token || !user) {
      setIsLoadingTenant(false);
      return;
    }

    try {
      setIsLoadingTenant(true);
      const [accessibleRes, treeRes] = await Promise.all([
        companiesApi.getAccessibleCompanies(),
        companiesApi.getCompanyTree().catch(() => ({ data: [] })),
      ]);

      const companiesList: UserCompanyAccess[] = accessibleRes.data || [];
      setAccessibleCompanies(companiesList);
      setCompanyTree(treeRes.data || []);

      // Determine active company
      const savedId = localStorage.getItem('active_company_id');
      let targetId = savedId ? parseInt(savedId, 10) : null;

      // Check if targetId is still in accessible companies (or if user is SuperAdmin)
      const isAllowed = isSuperAdmin || companiesList.some((c) => c.CompanyID === targetId);
      if (!targetId || !isAllowed) {
        // Fallback to primary or first available
        const primary = companiesList.find((c) => c.IsPrimary) || companiesList[0];
        targetId = primary ? primary.CompanyID : user.companyId || 1;
        localStorage.setItem('active_company_id', String(targetId));
      }

      setActiveCompanyId(targetId);

      // Set activeCompany details
      if (accessibleRes.activeCompany) {
        setActiveCompany(accessibleRes.activeCompany);
      } else {
        const found = companiesList.find((c) => c.CompanyID === targetId);
        if (found) {
          setActiveCompany({
            CompanyID: found.CompanyID,
            CompanyName: found.CompanyName,
            CompanyCode: found.CompanyCode,
            ParentCompanyID: found.ParentCompanyID,
            CompanyType: found.CompanyType as any,
            Status: 'Active',
            EnabledModules: found.EnabledModules,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load tenant context:', err);
    } finally {
      setIsLoadingTenant(false);
    }
  }, [token, user, isSuperAdmin]);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  const switchCompany = async (companyId: number) => {
    try {
      localStorage.setItem('active_company_id', String(companyId));
      setActiveCompanyId(companyId);

      const found = accessibleCompanies.find((c) => c.CompanyID === companyId);
      if (found) {
        setActiveCompany({
          CompanyID: found.CompanyID,
          CompanyName: found.CompanyName,
          CompanyCode: found.CompanyCode,
          ParentCompanyID: found.ParentCompanyID,
          CompanyType: found.CompanyType as any,
          Status: 'Active',
          EnabledModules: found.EnabledModules,
        });
      }

      // Re-fetch accessible companies with the new header to get updated activeCompany metadata
      const res = await companiesApi.getAccessibleCompanies();
      if (res.activeCompany) {
        setActiveCompany(res.activeCompany);
      }

      // Dispatch a custom event so dashboard/tasks/dates can automatically refetch
      window.dispatchEvent(new CustomEvent('tenantCompanyChanged', { detail: { companyId } }));
    } catch (err) {
      console.error('Failed to switch company:', err);
    }
  };

  const isModuleEnabled = (moduleName: string): boolean => {
    if (isSuperAdmin) return true;
    if (!activeCompany?.EnabledModules) return true;
    return activeCompany.EnabledModules.includes(moduleName);
  };

  const refreshTenantData = async () => {
    await fetchTenantData();
  };

  return (
    <TenantContext.Provider
      value={{
        activeCompanyId,
        activeCompany,
        accessibleCompanies,
        companyTree,
        isSuperAdmin,
        isLoadingTenant,
        switchCompany,
        isModuleEnabled,
        refreshTenantData,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
