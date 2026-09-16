"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const db_1 = require("../config/db");
class TenantService {
    /**
     * Recursively resolves all descendant company IDs under a given parent company ID
     */
    static async getDescendantCompanyIds(parentCompanyId) {
        const allCompaniesResult = await (0, db_1.executeQuery)(`SELECT CompanyID, ParentCompanyID FROM dbo.Companies WHERE IsDeleted = 0 AND Status = 'Active'`);
        const companies = allCompaniesResult.recordset;
        const descendantIds = [parentCompanyId];
        const findChildren = (parentId) => {
            const children = companies.filter((c) => c.ParentCompanyID === parentId);
            for (const child of children) {
                if (!descendantIds.includes(child.CompanyID)) {
                    descendantIds.push(child.CompanyID);
                    findChildren(child.CompanyID);
                }
            }
        };
        findChildren(parentCompanyId);
        return descendantIds;
    }
    /**
     * Builds a recursive hierarchy tree of companies for the given allowed company IDs
     */
    static async getCompanyTree(allowedCompanyIds) {
        const companiesResult = await (0, db_1.executeQuery)(`SELECT 
        c.CompanyID, c.ParentCompanyID, c.CompanyCode, c.CompanyName, c.LegalName,
        c.CompanyType, c.Status, c.EnabledModules, c.SubscriptionTier, c.MaxUsers,
        (SELECT COUNT(DISTINCT UserID) FROM (
          SELECT u.UserID FROM dbo.Users u WHERE u.CompanyID = c.CompanyID AND u.IsDeleted = 0
          UNION
          SELECT uc.UserID FROM dbo.UserCompany uc JOIN dbo.Users u2 ON uc.UserID = u2.UserID WHERE uc.CompanyID = c.CompanyID AND uc.IsActive = 1 AND u2.IsDeleted = 0
        ) AS all_u) AS UserCount,
        (SELECT COUNT(*) FROM dbo.Tasks t WHERE t.CompanyID = c.CompanyID AND t.IsDeleted = 0) AS TaskCount,
        (SELECT COUNT(*) FROM dbo.ImportantDates d WHERE d.CompanyID = c.CompanyID AND d.IsDeleted = 0) AS DateCount
       FROM dbo.Companies c
       WHERE c.IsDeleted = 0
       ORDER BY c.CompanyName ASC`);
        const allCompanies = companiesResult.recordset.map((c) => ({
            ...c,
            EnabledModules: c.EnabledModules
                ? typeof c.EnabledModules === 'string'
                    ? JSON.parse(c.EnabledModules)
                    : c.EnabledModules
                : ['tasks', 'dates', 'calendar', 'reports', 'audit'],
            children: [],
        }));
        // Filter by allowed IDs if provided
        const visibleCompanies = allowedCompanyIds
            ? allCompanies.filter((c) => allowedCompanyIds.includes(c.CompanyID))
            : allCompanies;
        const companyMap = new Map();
        visibleCompanies.forEach((c) => companyMap.set(c.CompanyID, { ...c, children: [] }));
        const rootNodes = [];
        visibleCompanies.forEach((c) => {
            const node = companyMap.get(c.CompanyID);
            if (c.ParentCompanyID && companyMap.has(c.ParentCompanyID)) {
                companyMap.get(c.ParentCompanyID).children.push(node);
            }
            else {
                rootNodes.push(node);
            }
        });
        return rootNodes;
    }
    /**
     * Gets list of companies that a user is authorized to access
     */
    static async getUserAccessibleCompanies(userId, roleName, tenantId, isPlatformAdmin) {
        // Platform Admin sees ALL companies across all tenants
        if (isPlatformAdmin) {
            const allCompanies = await (0, db_1.executeQuery)(`SELECT c.CompanyID, c.CompanyName, c.CompanyCode, c.ParentCompanyID, c.CompanyType,
                c.EnabledModules, 1 AS RoleID, 'Platform Admin' AS RoleName,
                'Global' AS AccessScope,
                CASE WHEN c.CompanyID = 1 THEN 1 ELSE 0 END AS IsPrimary
         FROM dbo.Companies c
         WHERE c.IsDeleted = 0 AND c.Status = 'Active'
         ORDER BY c.CompanyID ASC`);
            return allCompanies.recordset.map((c) => ({
                ...c,
                IsPrimary: Boolean(c.IsPrimary),
                EnabledModules: c.EnabledModules ? (typeof c.EnabledModules === 'string' ? JSON.parse(c.EnabledModules) : c.EnabledModules) : ['tasks', 'dates', 'calendar', 'reports', 'audit'],
            }));
        }
        // Super Admin sees all companies within their tenant
        if (roleName === 'Super Admin') {
            const tenantFilter = tenantId ? `AND c.TenantID = ${tenantId}` : '';
            const allCompanies = await (0, db_1.executeQuery)(`SELECT c.CompanyID, c.CompanyName, c.CompanyCode, c.ParentCompanyID, c.CompanyType,
                c.EnabledModules, 1 AS RoleID, 'Super Admin' AS RoleName,
                'Global' AS AccessScope,
                CASE WHEN c.CompanyID = 1 THEN 1 ELSE 0 END AS IsPrimary
         FROM dbo.Companies c
         WHERE c.IsDeleted = 0 AND c.Status = 'Active' ${tenantFilter}
         ORDER BY c.CompanyID ASC`);
            return allCompanies.recordset.map((c) => ({
                ...c,
                IsPrimary: Boolean(c.IsPrimary),
                EnabledModules: c.EnabledModules ? (typeof c.EnabledModules === 'string' ? JSON.parse(c.EnabledModules) : c.EnabledModules) : ['tasks', 'dates', 'calendar', 'reports', 'audit'],
            }));
        }
        // Query UserCompany mapping
        const mappingsResult = await (0, db_1.executeQuery)(`SELECT uc.CompanyID, c.CompanyName, c.CompanyCode, c.ParentCompanyID, c.CompanyType,
              c.EnabledModules, uc.RoleID, r.RoleName, uc.AccessScope, uc.IsPrimary
       FROM dbo.UserCompany uc
       JOIN dbo.Companies c ON uc.CompanyID = c.CompanyID
       JOIN dbo.Roles r ON uc.RoleID = r.RoleID
       WHERE uc.UserID = @userId AND uc.IsActive = 1 AND c.IsDeleted = 0 AND c.Status = 'Active'
       ORDER BY uc.IsPrimary DESC, c.CompanyName ASC`, { userId });
        let list = mappingsResult.recordset.map((c) => ({
            ...c,
            IsPrimary: Boolean(c.IsPrimary),
            EnabledModules: c.EnabledModules ? (typeof c.EnabledModules === 'string' ? JSON.parse(c.EnabledModules) : c.EnabledModules) : ['tasks', 'dates', 'calendar', 'reports', 'audit'],
        }));
        // Fallback: If no explicit UserCompany mapping exists, check user's default company
        if (list.length === 0) {
            const userDef = await (0, db_1.executeQuery)(`SELECT u.CompanyID, c.CompanyName, c.CompanyCode, c.ParentCompanyID, c.CompanyType,
                c.EnabledModules, u.RoleID, r.RoleName, 'Own' AS AccessScope, 1 AS IsPrimary
         FROM dbo.Users u
         JOIN dbo.Companies c ON u.CompanyID = c.CompanyID
         JOIN dbo.Roles r ON u.RoleID = r.RoleID
         WHERE u.UserID = @userId AND c.IsDeleted = 0 AND c.Status = 'Active'`, { userId });
            list = userDef.recordset.map((c) => ({
                ...c,
                IsPrimary: true,
                EnabledModules: c.EnabledModules ? (typeof c.EnabledModules === 'string' ? JSON.parse(c.EnabledModules) : c.EnabledModules) : ['tasks', 'dates', 'calendar', 'reports', 'audit'],
            }));
        }
        return list;
    }
    /**
     * Resolves the full TenantContext for the current request
     */
    static async resolveTenantContext(user, requestedCompanyId) {
        const accessibleCompanies = await this.getUserAccessibleCompanies(user.userId, user.roleName, user.tenantId, user.isPlatformAdmin);
        if (accessibleCompanies.length === 0) {
            throw new Error('User has no authorized companies.');
        }
        const isSuperAdmin = user.roleName === 'Super Admin' || Boolean(user.isPlatformAdmin);
        const allowedCompanyIds = accessibleCompanies.map((c) => c.CompanyID);
        // Determine target company: requestedCompanyId OR user's primary company OR first accessible
        let activeCompanyAccess;
        if (requestedCompanyId) {
            activeCompanyAccess = accessibleCompanies.find((c) => c.CompanyID === requestedCompanyId);
            if (!activeCompanyAccess) {
                if (!isSuperAdmin) {
                    const err = new Error(`Forbidden: Access to Company #${requestedCompanyId} is not permitted for your user account.`);
                    err.statusCode = 403;
                    throw err;
                }
            }
            // Tenant boundary: non-platform users cannot access companies outside their tenant
            if (!user.isPlatformAdmin && user.tenantId && activeCompanyAccess) {
                const compTenantResult = await (0, db_1.executeQuery)(`SELECT TenantID FROM dbo.Companies WHERE CompanyID = @compId`, { compId: requestedCompanyId });
                if (compTenantResult.recordset.length > 0 && compTenantResult.recordset[0].TenantID && compTenantResult.recordset[0].TenantID !== user.tenantId) {
                    const err = new Error('Forbidden: Cross-tenant access is not permitted.');
                    err.statusCode = 403;
                    throw err;
                }
            }
        }
        if (!activeCompanyAccess) {
            activeCompanyAccess = accessibleCompanies.find((c) => c.IsPrimary) || accessibleCompanies[0];
        }
        const activeCompanyId = activeCompanyAccess.CompanyID;
        // Fetch full active company record
        const compResult = await (0, db_1.executeQuery)(`SELECT CompanyID, CompanyName, CompanyCode, ParentCompanyID, CompanyType, Status, EnabledModules, SubscriptionTier
       FROM dbo.Companies WHERE CompanyID = @activeCompanyId`, { activeCompanyId });
        const activeCompany = compResult.recordset[0] || {
            CompanyID: activeCompanyId,
            CompanyName: activeCompanyAccess.CompanyName,
            CompanyCode: activeCompanyAccess.CompanyCode,
            ParentCompanyID: activeCompanyAccess.ParentCompanyID,
            CompanyType: activeCompanyAccess.CompanyType,
            Status: 'Active',
            EnabledModules: '["tasks","dates","calendar","reports","audit"]',
            SubscriptionTier: 'Enterprise',
        };
        const enabledModules = activeCompany.EnabledModules
            ? typeof activeCompany.EnabledModules === 'string'
                ? JSON.parse(activeCompany.EnabledModules)
                : activeCompany.EnabledModules
            : ['tasks', 'dates', 'calendar', 'reports', 'audit'];
        // Calculate Scope Company IDs based on user's AccessScope:
        // Level 1: 'Own' -> [activeCompanyId]
        // Level 2: 'Hierarchy' -> [activeCompanyId, ...all descendants]
        // Level 4: 'Global' (Super Admin) -> [activeCompanyId, ...all descendants]
        let scopeCompanyIds = [activeCompanyId];
        if (activeCompanyAccess.AccessScope === 'Hierarchy' || isSuperAdmin || activeCompanyAccess.AccessScope === 'Global') {
            scopeCompanyIds = await this.getDescendantCompanyIds(activeCompanyId);
        }
        return {
            tenantId: user.tenantId || null,
            isPlatformAdmin: Boolean(user.isPlatformAdmin),
            activeCompanyId,
            activeCompany: {
                ...activeCompany,
                EnabledModules: enabledModules,
            },
            allowedCompanyIds,
            scopeCompanyIds,
            accessScope: activeCompanyAccess.AccessScope,
            isSuperAdmin,
            enabledModules,
        };
    }
}
exports.TenantService = TenantService;
