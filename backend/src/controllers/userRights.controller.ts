import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../config/db';
import { logAudit } from '../services/audit.service';
import { TenantService } from '../services/tenant.service';

/**
 * Get users list with their current company access summary for User Company Rights screen
 */
export async function getUsersForCompanyRights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];

    let userFilter = 'u.IsDeleted = 0';
    if (!isSuperAdmin) {
      userFilter += ` AND (u.CompanyID IN (${allowedCompanyIds.join(', ')}) OR EXISTS (
        SELECT 1 FROM dbo.tbl_user_companies tuc 
        WHERE tuc.user_id = u.UserID AND tuc.company_id IN (${allowedCompanyIds.join(', ')}) AND tuc.is_active = 1
      ))`;
    }

    const query = `
      SELECT 
        u.UserID,
        u.Username,
        u.Email,
        u.RoleID,
        r.RoleName,
        u.CompanyID AS PrimaryCompanyID,
        c.CompanyName AS PrimaryCompanyName,
        c.CompanyCode AS PrimaryCompanyCode,
        e.EmployeeName,
        e.Designation,
        (
          SELECT COUNT(DISTINCT company_id) 
          FROM dbo.tbl_user_companies 
          WHERE user_id = u.UserID AND is_active = 1
        ) AS AssignedCompanyCount
      FROM dbo.Users u
      LEFT JOIN dbo.Roles r ON u.RoleID = r.RoleID
      LEFT JOIN dbo.Companies c ON u.CompanyID = c.CompanyID
      LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
      WHERE ${userFilter}
      ORDER BY e.EmployeeName ASC, u.Username ASC
    `;

    const result = await executeQuery<any>(query);

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get detailed company rights for a specific user
 */
export async function getUserCompanyRights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    if (!targetUserId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Valid User ID is required.' });
      return;
    }

    // Fetch user details
    const userResult = await executeQuery<any>(
      `SELECT u.UserID, u.Username, u.Email, u.RoleID, r.RoleName, u.CompanyID,
              e.EmployeeName, e.Designation
       FROM dbo.Users u
       LEFT JOIN dbo.Roles r ON u.RoleID = r.RoleID
       LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
       WHERE u.UserID = @targetUserId AND u.IsDeleted = 0`,
      { targetUserId }
    );

    if (userResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const targetUser = userResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];

    // Fetch active companies visible to requester
    let compWhere = `c.IsDeleted = 0 AND c.Status = 'Active'`;
    if (!isSuperAdmin) {
      compWhere += ` AND c.CompanyID IN (${allowedCompanyIds.join(', ')})`;
    }

    const companiesResult = await executeQuery<any>(
      `SELECT c.CompanyID, c.CompanyCode, c.CompanyName, c.LegalName, c.CompanyType, c.ParentCompanyID,
              p.CompanyName AS ParentCompanyName
       FROM dbo.Companies c
       LEFT JOIN dbo.Companies p ON c.ParentCompanyID = p.CompanyID
       WHERE ${compWhere}
       ORDER BY c.CompanyName ASC`
    );

    // Fetch currently assigned companies for target user
    const assignedResult = await executeQuery<any>(
      `SELECT company_id FROM dbo.tbl_user_companies WHERE user_id = @targetUserId AND is_active = 1`,
      { targetUserId }
    );

    const assignedSet = new Set<number>(assignedResult.recordset.map((r: any) => r.company_id));

    // Fallback: If no mappings exist yet, targetUser.CompanyID is assigned by default
    if (assignedSet.size === 0 && targetUser.CompanyID) {
      assignedSet.add(targetUser.CompanyID);
    }

    const companies = companiesResult.recordset.map((comp: any) => ({
      companyId: comp.CompanyID,
      companyCode: comp.CompanyCode,
      companyName: comp.CompanyName,
      legalName: comp.LegalName,
      companyType: comp.CompanyType,
      parentCompanyId: comp.ParentCompanyID,
      parentCompanyName: comp.ParentCompanyName,
      isAssigned: assignedSet.has(comp.CompanyID),
      isPrimary: targetUser.CompanyID === comp.CompanyID,
    }));

    res.json({
      success: true,
      data: {
        user: {
          userId: targetUser.UserID,
          username: targetUser.Username,
          email: targetUser.Email,
          roleId: targetUser.RoleID,
          roleName: targetUser.RoleName,
          employeeName: targetUser.EmployeeName,
          designation: targetUser.Designation,
          primaryCompanyId: targetUser.CompanyID,
        },
        assignedCompanyIds: Array.from(assignedSet),
        companies,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save user company rights (Single, Multiple, or All companies)
 */
export async function saveUserCompanyRights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const adminUserId = req.user!.userId;
    const { companyIds, primaryCompanyId } = req.body;

    if (!targetUserId || isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Valid User ID is required.' });
      return;
    }

    if (!Array.isArray(companyIds)) {
      res.status(400).json({ success: false, message: 'companyIds must be an array of company IDs.' });
      return;
    }

    // Verify target user exists
    const userResult = await executeQuery<any>(
      `SELECT UserID, Username, RoleID, CompanyID, EmployeeID FROM dbo.Users WHERE UserID = @targetUserId AND IsDeleted = 0`,
      { targetUserId }
    );

    if (userResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const targetUser = userResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];

    // Non-super-admins cannot assign companies outside their own permitted scope
    if (!isSuperAdmin) {
      const unauthorized = companyIds.filter((cid: number) => !allowedCompanyIds.includes(cid));
      if (unauthorized.length > 0) {
        res.status(403).json({
          success: false,
          message: `Forbidden: You do not have permission to assign Company IDs: ${unauthorized.join(', ')}`,
        });
        return;
      }
    }

    // Determine new primary company
    let newPrimaryId: number | null = primaryCompanyId ? parseInt(primaryCompanyId, 10) : null;
    if (!newPrimaryId || !companyIds.includes(newPrimaryId)) {
      newPrimaryId = companyIds.length > 0 ? companyIds[0] : null;
    }

    // Sync tbl_user_companies:
    // If admin is SuperAdmin, manage all companies for this user.
    // If admin is company admin, only update companies within admin's scope.
    let scopeWhere = '';
    if (!isSuperAdmin) {
      scopeWhere = ` AND company_id IN (${allowedCompanyIds.join(', ')})`;
    }

    // 1. Mark unselected companies as inactive
    if (companyIds.length === 0) {
      await executeQuery(
        `UPDATE dbo.tbl_user_companies SET is_active = 0, updated_by = @adminUserId, updated_at = SYSUTCDATETIME()
         WHERE user_id = @targetUserId ${scopeWhere}`,
        { targetUserId, adminUserId }
      );
      await executeQuery(
        `UPDATE dbo.UserCompany SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
         WHERE UserID = @targetUserId ${isSuperAdmin ? '' : `AND CompanyID IN (${allowedCompanyIds.join(', ')})`}`,
        { targetUserId }
      );
    } else {
      const placeholders = companyIds.map((_, idx) => `@cid_${idx}`).join(', ');
      const cidParams: Record<string, any> = { targetUserId, adminUserId };
      companyIds.forEach((cid: number, idx: number) => {
        cidParams[`cid_${idx}`] = cid;
      });

      await executeQuery(
        `UPDATE dbo.tbl_user_companies SET is_active = 0, updated_by = @adminUserId, updated_at = SYSUTCDATETIME()
         WHERE user_id = @targetUserId AND company_id NOT IN (${placeholders}) ${scopeWhere}`,
        cidParams
      );

      await executeQuery(
        `UPDATE dbo.UserCompany SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
         WHERE UserID = @targetUserId AND CompanyID NOT IN (${placeholders}) ${isSuperAdmin ? '' : `AND CompanyID IN (${allowedCompanyIds.join(', ')})`}`,
        cidParams
      );
    }

    // 2. Upsert selected companies in tbl_user_companies and UserCompany
    for (const compId of companyIds) {
      const isPrimary = compId === newPrimaryId ? 1 : 0;

      // Upsert tbl_user_companies
      const checkTbl = await executeQuery<any>(
        `SELECT id FROM dbo.tbl_user_companies WHERE user_id = @targetUserId AND company_id = @compId`,
        { targetUserId, compId }
      );

      if (checkTbl.recordset.length > 0) {
        await executeQuery(
          `UPDATE dbo.tbl_user_companies 
           SET is_active = 1, updated_by = @adminUserId, updated_at = SYSUTCDATETIME()
           WHERE user_id = @targetUserId AND company_id = @compId`,
          { targetUserId, compId, adminUserId }
        );
      } else {
        await executeQuery(
          `INSERT INTO dbo.tbl_user_companies (user_id, company_id, is_active, created_by, created_at, updated_by, updated_at)
           VALUES (@targetUserId, @compId, 1, @adminUserId, SYSUTCDATETIME(), @adminUserId, SYSUTCDATETIME())`,
          { targetUserId, compId, adminUserId }
        );
      }

      // Upsert UserCompany for backwards compatibility
      const checkUc = await executeQuery<any>(
        `SELECT UserCompanyID FROM dbo.UserCompany WHERE UserID = @targetUserId AND CompanyID = @compId`,
        { targetUserId, compId }
      );

      if (checkUc.recordset.length > 0) {
        await executeQuery(
          `UPDATE dbo.UserCompany 
           SET IsActive = 1, IsPrimary = @isPrimary, RoleID = @roleId, UpdatedAt = SYSUTCDATETIME()
           WHERE UserID = @targetUserId AND CompanyID = @compId`,
          { targetUserId, compId, isPrimary, roleId: targetUser.RoleID }
        );
      } else {
        await executeQuery(
          `INSERT INTO dbo.UserCompany (UserID, CompanyID, RoleID, AccessScope, IsPrimary, IsActive, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt)
           VALUES (@targetUserId, @compId, @roleId, N'Own', @isPrimary, 1, @adminUserId, SYSUTCDATETIME(), @adminUserId, SYSUTCDATETIME())`,
          { targetUserId, compId, roleId: targetUser.RoleID, isPrimary, adminUserId }
        );
      }
    }

    // 3. Update primary company in Users and Employees table
    if (newPrimaryId) {
      await executeQuery(
        `UPDATE dbo.Users SET CompanyID = @newPrimaryId, UpdatedAt = SYSUTCDATETIME() WHERE UserID = @targetUserId`,
        { newPrimaryId, targetUserId }
      );
      if (targetUser.EmployeeID) {
        await executeQuery(
          `UPDATE dbo.Employees SET CompanyID = @newPrimaryId, UpdatedAt = SYSUTCDATETIME() WHERE EmployeeID = @employeeId`,
          { newPrimaryId, employeeId: targetUser.EmployeeID }
        );
      }
      // Ensure only the designated company is marked IsPrimary in UserCompany
      await executeQuery(
        `UPDATE dbo.UserCompany SET IsPrimary = CASE WHEN CompanyID = @newPrimaryId THEN 1 ELSE 0 END WHERE UserID = @targetUserId`,
        { newPrimaryId, targetUserId }
      );
    }

    // 4. Audit Log
    await logAudit({
      userId: adminUserId,
      action: 'UPDATE_USER_COMPANY_RIGHTS',
      entityName: 'tbl_user_companies',
      entityId: targetUserId,
      newValues: {
        targetUserId,
        companyIds,
        primaryCompanyId: newPrimaryId,
        assignedCount: companyIds.length,
      },
      req,
    });

    res.json({
      success: true,
      message: `Successfully updated company access rights for ${targetUser.Username}. (${companyIds.length} companies assigned)`,
      data: {
        userId: targetUserId,
        assignedCompanyIds: companyIds,
        primaryCompanyId: newPrimaryId,
      },
    });
  } catch (err) {
    next(err);
  }
}
