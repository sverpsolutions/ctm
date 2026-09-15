"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformDashboard = getPlatformDashboard;
exports.getTenants = getTenants;
exports.getTenantById = getTenantById;
exports.createTenant = createTenant;
exports.updateTenant = updateTenant;
exports.suspendTenant = suspendTenant;
exports.activateTenant = activateTenant;
exports.resetTenantAdminPassword = resetTenantAdminPassword;
exports.getAllUsers = getAllUsers;
exports.createRegistrationLink = createRegistrationLink;
exports.getRegistrations = getRegistrations;
exports.getRegistrationById = getRegistrationById;
exports.approveRegistration = approveRegistration;
exports.rejectRegistration = rejectRegistration;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const audit_service_1 = require("../services/audit.service");
async function getPlatformDashboard(req, res, next) {
    try {
        const tenants = await (0, db_1.executeQuery)(`SELECT
        COUNT(*) AS TotalTenants,
        SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END) AS ActiveTenants,
        SUM(CASE WHEN Status = 'Suspended' THEN 1 ELSE 0 END) AS SuspendedTenants,
        SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) AS PendingTenants,
        SUM(CASE WHEN Status = 'Trial' THEN 1 ELSE 0 END) AS TrialTenants,
        SUM(CASE WHEN Status = 'Expired' THEN 1 ELSE 0 END) AS ExpiredTenants
       FROM dbo.Tenants WHERE IsDeleted = 0`);
        const companies = await (0, db_1.executeQuery)(`SELECT COUNT(*) AS TotalCompanies FROM dbo.Companies WHERE IsDeleted = 0`);
        const users = await (0, db_1.executeQuery)(`SELECT COUNT(*) AS TotalUsers FROM dbo.Users WHERE IsDeleted = 0 AND IsPlatformAdmin = 0`);
        const registrations = await (0, db_1.executeQuery)(`SELECT
        COUNT(*) AS TotalRegistrations,
        SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) AS PendingRegistrations
       FROM dbo.TenantRegistrations`);
        const recentTenants = await (0, db_1.executeQuery)(`SELECT TOP 5 TenantID, TenantCode, TenantName, Status, CreatedAt
       FROM dbo.Tenants WHERE IsDeleted = 0
       ORDER BY CreatedAt DESC`);
        const recentRegistrations = await (0, db_1.executeQuery)(`SELECT TOP 5 RegistrationID, CompanyName, ContactPerson, ContactEmail, Status, CreatedAt
       FROM dbo.TenantRegistrations
       ORDER BY CreatedAt DESC`);
        res.json({
            success: true,
            dashboard: {
                tenants: tenants.recordset[0],
                totalCompanies: companies.recordset[0]?.TotalCompanies || 0,
                totalUsers: users.recordset[0]?.TotalUsers || 0,
                registrations: registrations.recordset[0],
                recentTenants: recentTenants.recordset,
                recentRegistrations: recentRegistrations.recordset,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function getTenants(req, res, next) {
    try {
        const { search, status, page = '1', limit = '20' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;
        let whereClause = 'WHERE t.IsDeleted = 0';
        const params = { limitNum, offset };
        if (search && typeof search === 'string' && search.trim()) {
            whereClause += ` AND (t.TenantName LIKE @search OR t.TenantCode LIKE @search OR t.ContactEmail LIKE @search)`;
            params.search = `%${search.trim()}%`;
        }
        if (status && typeof status === 'string' && status !== 'all') {
            whereClause += ` AND t.Status = @status`;
            params.status = status;
        }
        const countResult = await (0, db_1.executeQuery)(`SELECT COUNT(*) AS Total FROM dbo.Tenants t ${whereClause}`, params);
        const tenantsResult = await (0, db_1.executeQuery)(`SELECT t.*,
        (SELECT COUNT(*) FROM dbo.Companies c WHERE c.TenantID = t.TenantID AND c.IsDeleted = 0) AS CompanyCount,
        (SELECT COUNT(*) FROM dbo.Users u WHERE u.TenantID = t.TenantID AND u.IsDeleted = 0 AND u.IsPlatformAdmin = 0) AS UserCount
       FROM dbo.Tenants t
       ${whereClause}
       ORDER BY t.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY`, params);
        res.json({
            success: true,
            tenants: tenantsResult.recordset,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: countResult.recordset[0]?.Total || 0,
                totalPages: Math.ceil((countResult.recordset[0]?.Total || 0) / limitNum),
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function getTenantById(req, res, next) {
    try {
        const { id } = req.params;
        const tenantResult = await (0, db_1.executeQuery)(`SELECT t.*,
        (SELECT COUNT(*) FROM dbo.Companies c WHERE c.TenantID = t.TenantID AND c.IsDeleted = 0) AS CompanyCount,
        (SELECT COUNT(*) FROM dbo.Users u WHERE u.TenantID = t.TenantID AND u.IsDeleted = 0 AND u.IsPlatformAdmin = 0) AS UserCount
       FROM dbo.Tenants t
       WHERE t.TenantID = @tenantId AND t.IsDeleted = 0`, { tenantId: parseInt(id, 10) });
        if (tenantResult.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Tenant not found.' });
            return;
        }
        const companiesResult = await (0, db_1.executeQuery)(`SELECT CompanyID, CompanyCode, CompanyName, CompanyType, Status, City, State
       FROM dbo.Companies WHERE TenantID = @tenantId AND IsDeleted = 0 ORDER BY CompanyName`, { tenantId: parseInt(id, 10) });
        res.json({
            success: true,
            tenant: tenantResult.recordset[0],
            companies: companiesResult.recordset,
        });
    }
    catch (err) {
        next(err);
    }
}
async function createTenant(req, res, next) {
    try {
        const { tenantCode, tenantName, legalName, contactPerson, contactEmail, contactMobile, industry, address, city, state, country, pinCode, website, gstin, pan, subscriptionTier, maxCompanies, maxUsers, licenseStartDate, licenseEndDate, enabledModules, status, } = req.body;
        if (!tenantCode || !tenantName || !contactEmail) {
            res.status(400).json({ success: false, message: 'Tenant code, name, and contact email are required.' });
            return;
        }
        const existing = await (0, db_1.executeQuery)(`SELECT TenantID FROM dbo.Tenants WHERE TenantCode = @code AND IsDeleted = 0`, { code: tenantCode.trim().toUpperCase() });
        if (existing.recordset.length > 0) {
            res.status(409).json({ success: false, message: 'Tenant code already exists.' });
            return;
        }
        const result = await (0, db_1.executeQuery)(`INSERT INTO dbo.Tenants (TenantCode, TenantName, LegalName, ContactPerson, ContactEmail, ContactMobile, Industry, Address, City, State, Country, PINCode, Website, GSTIN, PAN, SubscriptionTier, MaxCompanies, MaxUsers, LicenseStartDate, LicenseEndDate, EnabledModules, Status, CreatedBy)
       VALUES (@tenantCode, @tenantName, @legalName, @contactPerson, @contactEmail, @contactMobile, @industry, @address, @city, @state, @country, @pinCode, @website, @gstin, @pan, @subscriptionTier, @maxCompanies, @maxUsers, @licenseStartDate, @licenseEndDate, @enabledModules, @status, @createdBy)`, {
            tenantCode: tenantCode.trim().toUpperCase(),
            tenantName: tenantName.trim(),
            legalName: legalName || null,
            contactPerson: contactPerson || null,
            contactEmail: contactEmail.trim(),
            contactMobile: contactMobile || null,
            industry: industry || null,
            address: address || null,
            city: city || null,
            state: state || null,
            country: country || 'India',
            pinCode: pinCode || null,
            website: website || null,
            gstin: gstin || null,
            pan: pan || null,
            subscriptionTier: subscriptionTier || 'Standard',
            maxCompanies: maxCompanies || 5,
            maxUsers: maxUsers || 50,
            licenseStartDate: licenseStartDate || new Date().toISOString().split('T')[0],
            licenseEndDate: licenseEndDate || null,
            enabledModules: enabledModules ? JSON.stringify(enabledModules) : '["tasks","dates","calendar","reports","audit"]',
            status: status || 'Active',
            createdBy: req.user.userId,
        });
        await (0, audit_service_1.logAudit)({
            userId: req.user.userId,
            username: req.user.username,
            action: 'CREATE_TENANT',
            entityName: 'Tenants',
            entityId: result.recordset[0]?.TenantID,
            newValues: JSON.stringify({ tenantCode, tenantName }),
            req,
        });
        res.status(201).json({
            success: true,
            message: 'Tenant created successfully.',
            tenantId: result.recordset[0]?.TenantID,
        });
    }
    catch (err) {
        next(err);
    }
}
async function updateTenant(req, res, next) {
    try {
        const { id } = req.params;
        const tenantId = parseInt(id, 10);
        const { tenantName, legalName, contactPerson, contactEmail, contactMobile, industry, address, city, state, country, pinCode, website, gstin, pan, subscriptionTier, maxCompanies, maxUsers, licenseStartDate, licenseEndDate, enabledModules, status, } = req.body;
        const existing = await (0, db_1.executeQuery)(`SELECT * FROM dbo.Tenants WHERE TenantID = @tenantId AND IsDeleted = 0`, { tenantId });
        if (existing.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Tenant not found.' });
            return;
        }
        await (0, db_1.executeQuery)(`UPDATE dbo.Tenants SET
        TenantName = @tenantName, LegalName = @legalName, ContactPerson = @contactPerson,
        ContactEmail = @contactEmail, ContactMobile = @contactMobile, Industry = @industry,
        Address = @address, City = @city, State = @state, Country = @country, PINCode = @pinCode,
        Website = @website, GSTIN = @gstin, PAN = @pan,
        SubscriptionTier = @subscriptionTier, MaxCompanies = @maxCompanies, MaxUsers = @maxUsers,
        LicenseStartDate = @licenseStartDate, LicenseEndDate = @licenseEndDate,
        EnabledModules = @enabledModules, Status = @status,
        UpdatedBy = @updatedBy, UpdatedAt = SYSUTCDATETIME()
       WHERE TenantID = @tenantId`, {
            tenantId,
            tenantName: tenantName || existing.recordset[0].TenantName,
            legalName: legalName !== undefined ? legalName : existing.recordset[0].LegalName,
            contactPerson: contactPerson !== undefined ? contactPerson : existing.recordset[0].ContactPerson,
            contactEmail: contactEmail || existing.recordset[0].ContactEmail,
            contactMobile: contactMobile !== undefined ? contactMobile : existing.recordset[0].ContactMobile,
            industry: industry !== undefined ? industry : existing.recordset[0].Industry,
            address: address !== undefined ? address : existing.recordset[0].Address,
            city: city !== undefined ? city : existing.recordset[0].City,
            state: state !== undefined ? state : existing.recordset[0].State,
            country: country !== undefined ? country : existing.recordset[0].Country,
            pinCode: pinCode !== undefined ? pinCode : existing.recordset[0].PINCode,
            website: website !== undefined ? website : existing.recordset[0].Website,
            gstin: gstin !== undefined ? gstin : existing.recordset[0].GSTIN,
            pan: pan !== undefined ? pan : existing.recordset[0].PAN,
            subscriptionTier: subscriptionTier || existing.recordset[0].SubscriptionTier,
            maxCompanies: maxCompanies !== undefined ? maxCompanies : existing.recordset[0].MaxCompanies,
            maxUsers: maxUsers !== undefined ? maxUsers : existing.recordset[0].MaxUsers,
            licenseStartDate: licenseStartDate !== undefined ? licenseStartDate : existing.recordset[0].LicenseStartDate,
            licenseEndDate: licenseEndDate !== undefined ? licenseEndDate : existing.recordset[0].LicenseEndDate,
            enabledModules: enabledModules ? JSON.stringify(enabledModules) : existing.recordset[0].EnabledModules,
            status: status || existing.recordset[0].Status,
            updatedBy: req.user.userId,
        });
        await (0, audit_service_1.logAudit)({
            userId: req.user.userId,
            username: req.user.username,
            action: 'UPDATE_TENANT',
            entityName: 'Tenants',
            entityId: tenantId,
            oldValues: JSON.stringify(existing.recordset[0]),
            req,
        });
        res.json({ success: true, message: 'Tenant updated successfully.' });
    }
    catch (err) {
        next(err);
    }
}
async function suspendTenant(req, res, next) {
    try {
        const tenantId = parseInt(req.params.id, 10);
        await (0, db_1.executeQuery)(`UPDATE dbo.Tenants SET Status = 'Suspended', UpdatedBy = @userId, UpdatedAt = SYSUTCDATETIME() WHERE TenantID = @tenantId AND IsDeleted = 0`, { tenantId, userId: req.user.userId });
        await (0, audit_service_1.logAudit)({ userId: req.user.userId, username: req.user.username, action: 'SUSPEND_TENANT', entityName: 'Tenants', entityId: tenantId, req });
        res.json({ success: true, message: 'Tenant suspended.' });
    }
    catch (err) {
        next(err);
    }
}
async function activateTenant(req, res, next) {
    try {
        const tenantId = parseInt(req.params.id, 10);
        await (0, db_1.executeQuery)(`UPDATE dbo.Tenants SET Status = 'Active', UpdatedBy = @userId, UpdatedAt = SYSUTCDATETIME() WHERE TenantID = @tenantId AND IsDeleted = 0`, { tenantId, userId: req.user.userId });
        await (0, audit_service_1.logAudit)({ userId: req.user.userId, username: req.user.username, action: 'ACTIVATE_TENANT', entityName: 'Tenants', entityId: tenantId, req });
        res.json({ success: true, message: 'Tenant activated.' });
    }
    catch (err) {
        next(err);
    }
}
async function resetTenantAdminPassword(req, res, next) {
    try {
        const tenantId = parseInt(req.params.id, 10);
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
            return;
        }
        const adminUser = await (0, db_1.executeQuery)(`SELECT TOP 1 u.UserID, u.Username FROM dbo.Users u
       JOIN dbo.Roles r ON u.RoleID = r.RoleID
       WHERE u.TenantID = @tenantId AND r.RoleName = 'Super Admin' AND u.IsDeleted = 0
       ORDER BY u.UserID ASC`, { tenantId });
        if (adminUser.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'No tenant admin user found.' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        const hash = await bcryptjs_1.default.hash(newPassword, salt);
        await (0, db_1.executeQuery)(`UPDATE dbo.Users SET PasswordHash = @hash, MustChangePassword = 1, UpdatedAt = SYSUTCDATETIME() WHERE UserID = @userId`, { hash, userId: adminUser.recordset[0].UserID });
        await (0, audit_service_1.logAudit)({
            userId: req.user.userId, username: req.user.username,
            action: 'RESET_TENANT_ADMIN_PASSWORD', entityName: 'Users',
            entityId: adminUser.recordset[0].UserID, req,
        });
        res.json({ success: true, message: `Password reset for ${adminUser.recordset[0].Username}. They will be prompted to change it on next login.` });
    }
    catch (err) {
        next(err);
    }
}
async function getAllUsers(req, res, next) {
    try {
        const { search, tenantId, page = '1', limit = '20' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;
        let whereClause = 'WHERE u.IsDeleted = 0 AND u.IsPlatformAdmin = 0';
        const params = { limitNum, offset };
        if (search && typeof search === 'string' && search.trim()) {
            whereClause += ` AND (u.Username LIKE @search OR u.Email LIKE @search OR e.EmployeeName LIKE @search)`;
            params.search = `%${search.trim()}%`;
        }
        if (tenantId && typeof tenantId === 'string') {
            whereClause += ` AND u.TenantID = @tenantId`;
            params.tenantId = parseInt(tenantId, 10);
        }
        const countResult = await (0, db_1.executeQuery)(`SELECT COUNT(*) AS Total FROM dbo.Users u LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID ${whereClause}`, params);
        const usersResult = await (0, db_1.executeQuery)(`SELECT u.UserID, u.Username, u.Email, u.Status, u.LastLoginAt, u.TenantID,
              r.RoleName, e.EmployeeName, c.CompanyName, t.TenantName
       FROM dbo.Users u
       JOIN dbo.Roles r ON u.RoleID = r.RoleID
       LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
       JOIN dbo.Companies c ON u.CompanyID = c.CompanyID
       LEFT JOIN dbo.Tenants t ON u.TenantID = t.TenantID
       ${whereClause}
       ORDER BY u.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY`, params);
        res.json({
            success: true,
            users: usersResult.recordset,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: countResult.recordset[0]?.Total || 0,
                totalPages: Math.ceil((countResult.recordset[0]?.Total || 0) / limitNum),
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function createRegistrationLink(req, res, next) {
    try {
        const { expiresInDays = 7, notes } = req.body;
        const tokenRaw = crypto_1.default.randomBytes(48);
        const token = tokenRaw.toString('base64url');
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
        await (0, db_1.executeQuery)(`INSERT INTO dbo.TenantRegistrations (RegistrationToken, TokenExpiresAt, CompanyName, ContactPerson, ContactEmail, Notes, Status)
       VALUES (@token, @expiresAt, '', '', '', @notes, 'LinkGenerated')`, { token, expiresAt, notes: notes || null });
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const registrationUrl = `${clientUrl}/register/${token}`;
        await (0, audit_service_1.logAudit)({
            userId: req.user.userId, username: req.user.username,
            action: 'CREATE_REGISTRATION_LINK', entityName: 'TenantRegistrations',
            newValues: JSON.stringify({ expiresAt, notes }), req,
        });
        res.status(201).json({
            success: true,
            registrationUrl,
            token,
            expiresAt,
        });
    }
    catch (err) {
        next(err);
    }
}
async function getRegistrations(req, res, next) {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;
        let whereClause = 'WHERE 1=1';
        const params = { limitNum, offset };
        if (status && typeof status === 'string' && status !== 'all') {
            whereClause += ` AND r.Status = @status`;
            params.status = status;
        }
        const countResult = await (0, db_1.executeQuery)(`SELECT COUNT(*) AS Total FROM dbo.TenantRegistrations r ${whereClause}`, params);
        const regsResult = await (0, db_1.executeQuery)(`SELECT r.*, t.TenantName
       FROM dbo.TenantRegistrations r
       LEFT JOIN dbo.Tenants t ON r.TenantID = t.TenantID
       ${whereClause}
       ORDER BY r.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY`, params);
        res.json({
            success: true,
            registrations: regsResult.recordset,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: countResult.recordset[0]?.Total || 0,
                totalPages: Math.ceil((countResult.recordset[0]?.Total || 0) / limitNum),
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function getRegistrationById(req, res, next) {
    try {
        const { id } = req.params;
        const result = await (0, db_1.executeQuery)(`SELECT r.*, t.TenantName FROM dbo.TenantRegistrations r LEFT JOIN dbo.Tenants t ON r.TenantID = t.TenantID WHERE r.RegistrationID = @regId`, { regId: parseInt(id, 10) });
        if (result.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Registration not found.' });
            return;
        }
        res.json({ success: true, registration: result.recordset[0] });
    }
    catch (err) {
        next(err);
    }
}
async function approveRegistration(req, res, next) {
    try {
        const regId = parseInt(req.params.id, 10);
        const regResult = await (0, db_1.executeQuery)(`SELECT * FROM dbo.TenantRegistrations WHERE RegistrationID = @regId`, { regId });
        if (regResult.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Registration not found.' });
            return;
        }
        const reg = regResult.recordset[0];
        if (reg.Status !== 'Pending') {
            res.status(400).json({ success: false, message: `Registration is already ${reg.Status}.` });
            return;
        }
        // 1. Create Tenant
        const tenantCode = reg.CompanyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase().slice(-4);
        const tenantResult = await (0, db_1.executeQuery)(`INSERT INTO dbo.Tenants (TenantCode, TenantName, LegalName, ContactPerson, ContactEmail, ContactMobile, Industry, Address, City, State, Country, PINCode, Website, GSTIN, PAN, SubscriptionTier, MaxCompanies, MaxUsers, EnabledModules, Status, CreatedBy)
       VALUES (@code, @name, @legalName, @contactPerson, @email, @mobile, @industry, @address, @city, @state, @country, @pinCode, @website, @gstin, @pan, 'Standard', @numBranches, @numUsers, @modules, 'Active', @createdBy)`, {
            code: tenantCode,
            name: reg.CompanyName,
            legalName: reg.LegalName || null,
            contactPerson: reg.ContactPerson,
            email: reg.ContactEmail,
            mobile: reg.ContactMobile || null,
            industry: reg.Industry || null,
            address: reg.Address || null,
            city: reg.City || null,
            state: reg.State || null,
            country: reg.Country || 'India',
            pinCode: reg.PINCode || null,
            website: reg.Website || null,
            gstin: reg.GSTIN || null,
            pan: reg.PAN || null,
            numBranches: (reg.NumBranches || 1) + 2,
            numUsers: reg.NumUsers || 10,
            modules: reg.RequestedModules || '["tasks","dates","calendar","reports","audit"]',
            createdBy: req.user.userId,
        });
        const newTenantId = tenantResult.recordset[0]?.TenantID;
        // 2. Create primary Company for the tenant
        const companyCode = tenantCode.substring(0, 8) + '-HQ';
        const companyResult = await (0, db_1.executeQuery)(`INSERT INTO dbo.Companies (TenantID, CompanyCode, CompanyName, LegalName, CompanyType, ShortName, City, State, Country, Status, EnabledModules, SubscriptionTier, MaxUsers)
       VALUES (@tenantId, @code, @name, @legalName, @companyType, @shortName, @city, @state, @country, 'Active', @modules, 'Standard', @maxUsers)`, {
            tenantId: newTenantId,
            code: companyCode,
            name: reg.CompanyName,
            legalName: reg.LegalName || null,
            companyType: reg.CompanyType || 'Subsidiary',
            shortName: reg.CompanyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12),
            city: reg.City || null,
            state: reg.State || null,
            country: reg.Country || 'India',
            modules: reg.RequestedModules || '["tasks","dates","calendar","reports","audit"]',
            maxUsers: reg.NumUsers || 10,
        });
        const newCompanyId = companyResult.recordset[0]?.CompanyID;
        // 3. Get Super Admin role ID (tenant-level admin)
        const saRole = await (0, db_1.executeQuery)(`SELECT RoleID FROM dbo.Roles WHERE RoleName = 'Super Admin' AND (IsPlatformRole = 0 OR IsPlatformRole IS NULL) LIMIT 1`);
        const saRoleId = saRole.recordset[0]?.RoleID || 1;
        // 4. Create Tenant Admin user
        const adminUsername = reg.AdminUsername || reg.AdminEmail || reg.ContactEmail;
        const adminEmail = reg.AdminEmail || reg.ContactEmail;
        const passwordHash = reg.PasswordHash || bcryptjs_1.default.hashSync('ChangeMe@123', bcryptjs_1.default.genSaltSync(12));
        const userResult = await (0, db_1.executeQuery)(`INSERT INTO dbo.Users (CompanyID, Username, Email, PasswordHash, RoleID, Status, TenantID, IsPlatformAdmin, MustChangePassword)
       VALUES (@companyId, @username, @email, @pwdHash, @roleId, 'Active', @tenantId, 0, @mustChange)`, {
            companyId: newCompanyId,
            username: adminUsername,
            email: adminEmail,
            pwdHash: passwordHash,
            roleId: saRoleId,
            tenantId: newTenantId,
            mustChange: reg.PasswordHash ? 0 : 1,
        });
        const newUserId = userResult.recordset[0]?.UserID;
        // 5. Create UserCompany mapping
        await (0, db_1.executeQuery)(`INSERT INTO dbo.UserCompany (UserID, CompanyID, RoleID, AccessScope, IsPrimary, IsActive)
       VALUES (@userId, @companyId, @roleId, 'Global', 1, 1)`, { userId: newUserId, companyId: newCompanyId, roleId: saRoleId });
        // 6. Seed default departments for the new company
        for (const dept of ['Administration', 'Finance', 'Operations', 'Human Resources', 'IT']) {
            const deptCode = 'DEPT-' + dept.replace(/[^A-Z]/gi, '').substring(0, 4).toUpperCase();
            await (0, db_1.executeQuery)(`INSERT INTO dbo.Departments (CompanyID, DepartmentCode, DepartmentName, Status)
         VALUES (@companyId, @code, @name, 'Active')`, { companyId: newCompanyId, code: deptCode, name: dept });
        }
        // 7. Update registration
        await (0, db_1.executeQuery)(`UPDATE dbo.TenantRegistrations SET TenantID = @tenantId, Status = 'Approved', ReviewedBy = @reviewedBy, ReviewedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE RegistrationID = @regId`, { tenantId: newTenantId, reviewedBy: req.user.userId, regId });
        await (0, audit_service_1.logAudit)({
            userId: req.user.userId, username: req.user.username,
            action: 'APPROVE_REGISTRATION', entityName: 'TenantRegistrations',
            entityId: regId, newValues: JSON.stringify({ tenantId: newTenantId, companyId: newCompanyId, adminUsername }), req,
        });
        res.json({
            success: true,
            message: 'Registration approved. Tenant, company, and admin user created.',
            tenantId: newTenantId,
            companyId: newCompanyId,
            adminUsername,
        });
    }
    catch (err) {
        next(err);
    }
}
async function rejectRegistration(req, res, next) {
    try {
        const regId = parseInt(req.params.id, 10);
        const { reason } = req.body;
        await (0, db_1.executeQuery)(`UPDATE dbo.TenantRegistrations SET Status = 'Rejected', RejectionReason = @reason, ReviewedBy = @reviewedBy, ReviewedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE RegistrationID = @regId`, { reason: reason || 'No reason provided', reviewedBy: req.user.userId, regId });
        await (0, audit_service_1.logAudit)({
            userId: req.user.userId, username: req.user.username,
            action: 'REJECT_REGISTRATION', entityName: 'TenantRegistrations',
            entityId: regId, newValues: JSON.stringify({ reason }), req,
        });
        res.json({ success: true, message: 'Registration rejected.' });
    }
    catch (err) {
        next(err);
    }
}
