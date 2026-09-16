import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../config/db';
import { TenantService } from '../services/tenant.service';
import { logAudit } from '../services/audit.service';

/**
 * Get recursive hierarchy tree of companies accessible to current user
 */
export async function getCompanyHierarchyTree(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isSuperAdmin = req.tenant?.isSuperAdmin;
    const allowedIds = isSuperAdmin ? undefined : req.tenant?.allowedCompanyIds;
    const tree = await TenantService.getCompanyTree(allowedIds);

    res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get flat list of accessible companies for the active user (for Header Switcher)
 */
export async function getAccessibleCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const roleName = req.user!.roleName;
    const accessible = await TenantService.getUserAccessibleCompanies(userId, roleName);

    res.json({
      success: true,
      data: accessible,
      activeCompanyId: req.tenant?.activeCompanyId || accessible[0]?.CompanyID,
      activeCompany: req.tenant?.activeCompany,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get paginated list of companies
 */
export async function getCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, status, companyType, parentCompanyId, page = 1, limit = 20 } = req.query;
    const isSuperAdmin = req.tenant?.isSuperAdmin;

    let whereSql = `c.IsDeleted = 0`;
    const params: Record<string, any> = {};

    if (!isSuperAdmin && req.tenant?.allowedCompanyIds) {
      whereSql += ` AND c.CompanyID IN (${req.tenant.allowedCompanyIds.join(', ')})`;
    }

    if (search) {
      whereSql += ` AND (c.CompanyName LIKE @search OR c.CompanyCode LIKE @search OR c.LegalName LIKE @search OR c.City LIKE @search)`;
      params.search = `%${search}%`;
    }

    if (status) {
      whereSql += ` AND c.Status = @status`;
      params.status = status;
    }

    if (companyType) {
      whereSql += ` AND c.CompanyType = @companyType`;
      params.companyType = companyType;
    }

    if (parentCompanyId) {
      whereSql += ` AND c.ParentCompanyID = @parentCompanyId`;
      params.parentCompanyId = parseInt(parentCompanyId as string, 10);
    }

    const countResult = await executeQuery<{ TotalCount: number }>(
      `SELECT COUNT(*) AS TotalCount FROM dbo.Companies c WHERE ${whereSql}`,
      params
    );
    const totalRecords = countResult.recordset[0]?.TotalCount || 0;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    params.offset = offset;
    params.limitNum = limitNum;

    const listResult = await executeQuery<any>(
      `SELECT 
        c.CompanyID, c.ParentCompanyID, c.CompanyCode, c.CompanyName, c.LegalName,
        c.CompanyType, c.City, c.State, c.Country, c.GSTIN, c.PAN, c.Email, c.Phone,
        c.Logo, c.EnabledModules, c.SubscriptionTier, c.MaxUsers, c.Status,
        c.CreatedAt, c.UpdatedAt,
        p.CompanyName AS ParentCompanyName,
        (SELECT COUNT(*) FROM dbo.Companies ch WHERE ch.ParentCompanyID = c.CompanyID AND ch.IsDeleted = 0) AS ChildCompanyCount,
        (SELECT COUNT(DISTINCT u.UserID) 
         FROM dbo.Users u 
         LEFT JOIN dbo.UserCompany uc ON u.UserID = uc.UserID AND uc.IsActive = 1
         WHERE (u.CompanyID = c.CompanyID OR uc.CompanyID = c.CompanyID) AND u.IsDeleted = 0) AS UserCount,
        (SELECT COUNT(*) FROM dbo.Tasks t WHERE t.CompanyID = c.CompanyID AND t.IsDeleted = 0) AS TaskCount,
        (SELECT COUNT(*) FROM dbo.ImportantDates d WHERE d.CompanyID = c.CompanyID AND d.IsDeleted = 0) AS DateCount
       FROM dbo.Companies c
       LEFT JOIN dbo.Companies p ON c.ParentCompanyID = p.CompanyID
       WHERE ${whereSql}
       ORDER BY c.CompanyID ASC
       OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY`,
      params
    );

    const records = listResult.recordset.map((c) => ({
      ...c,
      EnabledModules: c.EnabledModules
        ? typeof c.EnabledModules === 'string'
          ? JSON.parse(c.EnabledModules)
          : c.EnabledModules
        : ['tasks', 'dates', 'calendar', 'reports', 'audit'],
    }));

    res.json({
      success: true,
      data: records,
      pagination: {
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get company details by ID
 */
export async function getCompanyById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = parseInt(req.params.id, 10);
    const isSuperAdmin = req.tenant?.isSuperAdmin;

    if (!isSuperAdmin && !req.tenant?.allowedCompanyIds.includes(companyId)) {
      res.status(403).json({ success: false, message: 'Forbidden: Access to this company is not permitted.' });
      return;
    }

    const companyResult = await executeQuery<any>(
      `SELECT c.*, p.CompanyName AS ParentCompanyName
       FROM dbo.Companies c
       LEFT JOIN dbo.Companies p ON c.ParentCompanyID = p.CompanyID
       WHERE c.CompanyID = @companyId AND c.IsDeleted = 0`,
      { companyId }
    );

    if (companyResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Company not found.' });
      return;
    }

    const company = companyResult.recordset[0];
    company.EnabledModules = company.EnabledModules
      ? typeof company.EnabledModules === 'string'
        ? JSON.parse(company.EnabledModules)
        : company.EnabledModules
      : ['tasks', 'dates', 'calendar', 'reports', 'audit'];

    // Child companies
    const childrenResult = await executeQuery<any>(
      `SELECT CompanyID, CompanyCode, CompanyName, CompanyType, Status,
              (SELECT COUNT(DISTINCT u.UserID) 
               FROM dbo.Users u 
               LEFT JOIN dbo.UserCompany uc ON u.UserID = uc.UserID AND uc.IsActive = 1
               WHERE (u.CompanyID = c.CompanyID OR uc.CompanyID = c.CompanyID) AND u.IsDeleted = 0) AS UserCount
       FROM dbo.Companies c
       WHERE c.ParentCompanyID = @companyId AND c.IsDeleted = 0`,
      { companyId }
    );

    // Mapped Users
    const usersResult = await executeQuery<any>(
      `SELECT uc.UserCompanyID, uc.UserID, uc.RoleID, uc.AccessScope, uc.IsPrimary, uc.IsActive,
              u.Username, u.Email, r.RoleName, e.EmployeeName
       FROM dbo.UserCompany uc
       JOIN dbo.Users u ON uc.UserID = u.UserID
       JOIN dbo.Roles r ON uc.RoleID = r.RoleID
       LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
       WHERE uc.CompanyID = @companyId AND u.IsDeleted = 0`,
      { companyId }
    );

    res.json({
      success: true,
      data: {
        ...company,
        childCompanies: childrenResult.recordset,
        mappedUsers: usersResult.recordset,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new Company or Child Company
 */
export async function createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const {
      companyName,
      companyCode,
      legalName,
      companyType = 'Subsidiary',
      parentCompanyId,
      address,
      city,
      state,
      country = 'India',
      pinCode,
      phone,
      email,
      website,
      gstin,
      pan,
      logo,
      enabledModules = ['tasks', 'dates', 'calendar', 'reports', 'audit'],
      subscriptionTier = 'Enterprise',
      maxUsers = 100,
    } = req.body;

    if (!companyName || !companyCode) {
      res.status(400).json({ success: false, message: 'Company name and company code are required.' });
      return;
    }

    // Check duplicate code
    const existing = await executeQuery<any>(
      `SELECT CompanyID FROM dbo.Companies WHERE CompanyCode = @companyCode AND IsDeleted = 0`,
      { companyCode: companyCode.trim().toUpperCase() }
    );
    if (existing.recordset.length > 0) {
      res.status(400).json({ success: false, message: `Company Code '${companyCode}' already exists.` });
      return;
    }

    const modulesJson = JSON.stringify(enabledModules);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId || 1;

    const insertResult = await executeQuery<{ CompanyID: number }>(
      `INSERT INTO dbo.Companies (
        ParentCompanyID, CompanyCode, CompanyName, LegalName, CompanyType,
        Address, City, State, Country, PINCode, Phone, Email, Website,
        GSTIN, PAN, Logo, EnabledModules, SubscriptionTier, MaxUsers, Status,
        CreatedBy, CreatedAt, UpdatedAt, TenantID
      )
      OUTPUT INSERTED.CompanyID
      VALUES (
        @parentCompanyId, @companyCode, @companyName, @legalName, @companyType,
        @address, @city, @state, @country, @pinCode, @phone, @email, @website,
        @gstin, @pan, @logo, @modulesJson, @subscriptionTier, @maxUsers, N'Active',
        @userId, SYSUTCDATETIME(), SYSUTCDATETIME(), @tenantId
      )`,
      {
        parentCompanyId: parentCompanyId ? parseInt(parentCompanyId, 10) : null,
        companyCode: companyCode.trim().toUpperCase(),
        companyName: companyName.trim(),
        legalName: legalName || null,
        companyType,
        address: address || null,
        city: city || null,
        state: state || null,
        country,
        pinCode: pinCode || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        gstin: gstin || null,
        pan: pan || null,
        logo: logo || null,
        modulesJson,
        subscriptionTier,
        maxUsers: parseInt(maxUsers, 10) || 100,
        userId,
        tenantId,
      }
    );

    const newCompanyId = insertResult.recordset[0].CompanyID;

    // Automatically map SuperAdmin to this new company
    await executeQuery(
      `INSERT INTO dbo.UserCompany (UserID, CompanyID, RoleID, AccessScope, IsPrimary, IsActive)
       VALUES (@userId, @newCompanyId, 1, N'Global', 0, 1)`,
      { userId, newCompanyId }
    );

    await logAudit({
      userId,
      action: 'CREATE_COMPANY',
      entityName: 'Companies',
      entityId: newCompanyId,
      newValues: { companyCode, companyName, parentCompanyId, companyType, subscriptionTier },
      req,
    });

    res.status(201).json({
      success: true,
      message: `Company '${companyName}' (${companyCode}) created successfully.`,
      companyId: newCompanyId,
      data: { CompanyID: newCompanyId, CompanyCode: companyCode, CompanyName: companyName },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing Company
 */
export async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const isSuperAdmin = req.tenant?.isSuperAdmin;

    if (!isSuperAdmin && !req.tenant?.allowedCompanyIds.includes(companyId)) {
      res.status(403).json({ success: false, message: 'Forbidden: Access to update this company is not permitted.' });
      return;
    }

    const {
      companyName,
      legalName,
      companyType,
      parentCompanyId,
      address,
      city,
      state,
      country,
      pinCode,
      phone,
      email,
      website,
      gstin,
      pan,
      logo,
      enabledModules,
      subscriptionTier,
      maxUsers,
      status,
    } = req.body;

    const modulesJson = enabledModules ? JSON.stringify(enabledModules) : undefined;

    await executeQuery(
      `UPDATE dbo.Companies SET
        CompanyName = ISNULL(@companyName, CompanyName),
        LegalName = ISNULL(@legalName, LegalName),
        CompanyType = ISNULL(@companyType, CompanyType),
        ParentCompanyID = @parentCompanyId,
        Address = ISNULL(@address, Address),
        City = ISNULL(@city, City),
        State = ISNULL(@state, State),
        Country = ISNULL(@country, Country),
        PINCode = ISNULL(@pinCode, PINCode),
        Phone = ISNULL(@phone, Phone),
        Email = ISNULL(@email, Email),
        Website = ISNULL(@website, Website),
        GSTIN = ISNULL(@gstin, GSTIN),
        PAN = ISNULL(@pan, PAN),
        Logo = ISNULL(@logo, Logo),
        EnabledModules = ISNULL(@modulesJson, EnabledModules),
        SubscriptionTier = ISNULL(@subscriptionTier, SubscriptionTier),
        MaxUsers = ISNULL(@maxUsers, MaxUsers),
        Status = ISNULL(@status, Status),
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
      WHERE CompanyID = @companyId`,
      {
        companyId,
        companyName: companyName ? companyName.trim() : null,
        legalName: legalName || null,
        companyType: companyType || null,
        parentCompanyId: parentCompanyId !== undefined ? (parentCompanyId ? parseInt(parentCompanyId, 10) : null) : null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        pinCode: pinCode || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        gstin: gstin || null,
        pan: pan || null,
        logo: logo || null,
        modulesJson: modulesJson || null,
        subscriptionTier: subscriptionTier || null,
        maxUsers: maxUsers ? parseInt(maxUsers, 10) : null,
        status: status || null,
        userId,
      }
    );

    await logAudit({
      userId,
      action: 'UPDATE_COMPANY',
      entityName: 'Companies',
      entityId: companyId,
      newValues: req.body,
      req,
    });

    res.json({
      success: true,
      message: 'Company updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Assign user to company with specific role and scope
 */
export async function assignUserToCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = parseInt(req.params.id, 10);
    const { userId, roleId, accessScope = 'Own', isPrimary = false } = req.body;

    if (!userId || !roleId) {
      res.status(400).json({ success: false, message: 'User ID and Role ID are required.' });
      return;
    }

    if (isPrimary) {
      // Clear other primary flags for this user
      await executeQuery(`UPDATE dbo.UserCompany SET IsPrimary = 0 WHERE UserID = @userId`, { userId });
      // Update primary company in Users and Employees tables
      await executeQuery(`UPDATE dbo.Users SET CompanyID = @companyId WHERE UserID = @userId`, { companyId, userId });
      await executeQuery(
        `UPDATE dbo.Employees SET CompanyID = @companyId 
         WHERE EmployeeID = (SELECT EmployeeID FROM dbo.Users WHERE UserID = @userId)`,
        { companyId, userId }
      );
    } else {
      // If user currently has no company assigned in Users table, set this as CompanyID
      await executeQuery(
        `UPDATE dbo.Users SET CompanyID = @companyId WHERE UserID = @userId AND (CompanyID IS NULL OR CompanyID = 0)`,
        { companyId, userId }
      );
    }

    // Upsert UserCompany mapping
    const existing = await executeQuery<any>(
      `SELECT UserCompanyID FROM dbo.UserCompany WHERE UserID = @userId AND CompanyID = @companyId`,
      { userId, companyId }
    );

    if (existing.recordset.length > 0) {
      await executeQuery(
        `UPDATE dbo.UserCompany SET
          RoleID = @roleId,
          AccessScope = @accessScope,
          IsPrimary = @isPrimary,
          IsActive = 1,
          UpdatedAt = SYSUTCDATETIME()
         WHERE UserID = @userId AND CompanyID = @companyId`,
        { userId, companyId, roleId, accessScope, isPrimary: isPrimary ? 1 : 0 }
      );
    } else {
      await executeQuery(
        `INSERT INTO dbo.UserCompany (UserID, CompanyID, RoleID, AccessScope, IsPrimary, IsActive)
         VALUES (@userId, @companyId, @roleId, @accessScope, @isPrimary, 1)`,
        { userId, companyId, roleId, accessScope, isPrimary: isPrimary ? 1 : 0 }
      );
    }

    res.json({
      success: true,
      message: 'User-Company mapping updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove user from company
 */
export async function removeUserFromCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);

    await executeQuery(
      `DELETE FROM dbo.UserCompany WHERE UserID = @userId AND CompanyID = @companyId`,
      { userId, companyId }
    );

    res.json({
      success: true,
      message: 'User removed from company successfully.',
    });
  } catch (err) {
    next(err);
  }
}
