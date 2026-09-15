"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
exports.requireModule = requireModule;
exports.getTenantWhereClause = getTenantWhereClause;
const tenant_service_1 = require("../services/tenant.service");
/**
 * TenantContext Middleware:
 * 1. Validates logged-in user context.
 * 2. Reads X-Company-ID header or query param.
 * 3. Resolves permitted companies, hierarchy descendants, and active tenant context.
 * 4. Stretches user context and enforces 403 Forbidden on unauthorized tenant requests.
 */
async function tenantMiddleware(req, res, next) {
    try {
        if (!req.user) {
            next();
            return;
        }
        // Extract requested CompanyID from headers or query parameters
        let requestedCompanyId = null;
        const headerCompanyId = req.headers['x-company-id'];
        const queryCompanyId = req.query.companyId;
        if (headerCompanyId && typeof headerCompanyId === 'string' && !isNaN(parseInt(headerCompanyId, 10))) {
            requestedCompanyId = parseInt(headerCompanyId, 10);
        }
        else if (queryCompanyId && typeof queryCompanyId === 'string' && !isNaN(parseInt(queryCompanyId, 10))) {
            requestedCompanyId = parseInt(queryCompanyId, 10);
        }
        // Resolve TenantContext with tenant boundary info from JWT
        const tenantContext = await tenant_service_1.TenantService.resolveTenantContext({
            userId: req.user.userId,
            roleName: req.user.roleName,
            companyId: req.user.companyId,
            tenantId: req.user.tenantId,
            isPlatformAdmin: req.user.isPlatformAdmin,
        }, requestedCompanyId);
        // Attach to Request
        req.tenant = tenantContext;
        // Keep req.user.companyId in sync with active tenant
        req.user.companyId = tenantContext.activeCompanyId;
        next();
    }
    catch (err) {
        if (err.statusCode === 403 || err.message?.includes('Forbidden')) {
            res.status(403).json({
                success: false,
                message: err.message || 'Forbidden: You do not have access to this company.',
            });
            return;
        }
        next(err);
    }
}
/**
 * Module Licensing Guard:
 * Blocks requests if the active tenant does not have the specified module enabled.
 */
function requireModule(moduleName) {
    return (req, res, next) => {
        if (!req.tenant) {
            next();
            return;
        }
        if (req.tenant.isSuperAdmin || req.tenant.isPlatformAdmin) {
            next();
            return;
        }
        if (!req.tenant.enabledModules.includes(moduleName)) {
            res.status(403).json({
                success: false,
                message: `Forbidden: The '${moduleName}' module is not enabled for company '${req.tenant.activeCompany.CompanyName}'.`,
            });
            return;
        }
        next();
    };
}
/**
 * Helper to produce SQL WHERE clause for tenant isolation
 */
function getTenantWhereClause(tenant, tableAlias = 't') {
    if (tenant.scopeCompanyIds.length === 1) {
        return `${tableAlias}.CompanyID = ${tenant.scopeCompanyIds[0]}`;
    }
    return `${tableAlias}.CompanyID IN (${tenant.scopeCompanyIds.join(', ')})`;
}
