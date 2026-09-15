"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = getAuditLogs;
const db_1 = require("../config/db");
async function getAuditLogs(req, res, next) {
    try {
        const { page = '1', limit = '30', entityName, action, userId, startDate, endDate } = req.query;
        const isSuperAdmin = req.tenant?.isSuperAdmin;
        const scopeIds = req.tenant?.scopeCompanyIds || [req.user.companyId];
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
        const offset = (pageNum - 1) * limitNum;
        let whereClauses = ['1=1'];
        const params = { limitNum, offset };
        // Tenant isolation on audit trail
        if (!isSuperAdmin) {
            whereClauses.push(`(a.CompanyID IN (${scopeIds.join(', ')}) OR a.CompanyID IS NULL)`);
        }
        if (entityName) {
            whereClauses.push(`a.EntityName = @entityName`);
            params.entityName = entityName;
        }
        if (action) {
            whereClauses.push(`a.Action LIKE @action`);
            params.action = `%${action}%`;
        }
        if (userId) {
            whereClauses.push(`a.UserID = @userId`);
            params.userId = parseInt(userId, 10);
        }
        if (startDate) {
            whereClauses.push(`a.CreatedAt >= @startDate`);
            params.startDate = startDate;
        }
        if (endDate) {
            whereClauses.push(`a.CreatedAt <= @endDate`);
            params.endDate = endDate;
        }
        const whereSql = whereClauses.join(' AND ');
        const countResult = await (0, db_1.executeQuery)(`SELECT COUNT(*) AS Total FROM dbo.AuditLogs a WHERE ${whereSql}`, params);
        const total = countResult.recordset[0]?.Total || 0;
        const logs = await (0, db_1.executeQuery)(`SELECT a.*, c.CompanyName, c.CompanyCode 
       FROM dbo.AuditLogs a
       LEFT JOIN dbo.Companies c ON a.CompanyID = c.CompanyID
       WHERE ${whereSql}
       ORDER BY a.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY`, params);
        res.json({
            success: true,
            data: logs.recordset,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (err) {
        next(err);
    }
}
