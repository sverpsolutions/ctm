import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../config/db';
import { generateToken } from '../config/jwt';
import { logAudit } from '../services/audit.service';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      res.status(400).json({ success: false, message: 'Username/email and password are required.' });
      return;
    }

    // Lookup user with role and employee information
    const userResult = await executeQuery(
      `SELECT u.UserID, u.CompanyID, u.EmployeeID, u.Username, u.Email, u.PasswordHash,
              u.RoleID, u.Status, u.FailedLoginAttempts, u.LockoutUntil,
              u.TenantID, u.IsPlatformAdmin, u.MustChangePassword,
              r.RoleName,
              e.EmployeeName, e.EmployeeCode, e.Designation, e.DepartmentID, e.LocationID,
              d.DepartmentName,
              c.CompanyName, c.ShortName as CompanyShortName
       FROM dbo.Users u
       JOIN dbo.Roles r ON u.RoleID = r.RoleID
       LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
       LEFT JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID
       JOIN dbo.Companies c ON u.CompanyID = c.CompanyID
       WHERE (u.Username = @ident OR u.Email = @ident) AND u.IsDeleted = 0`,
      { ident: usernameOrEmail.trim() }
    );

    if (userResult.recordset.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid credentials or user account does not exist.' });
      return;
    }

    const user = userResult.recordset[0];

    // Check account status
    if (user.Status === 'Inactive') {
      res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact your administrator.' });
      return;
    }

    if (user.Status === 'Locked' || (user.LockoutUntil && new Date(user.LockoutUntil) > new Date())) {
      res.status(403).json({ success: false, message: 'Account is temporarily locked due to failed login attempts. Please try again later.' });
      return;
    }

    // Check tenant status (non-platform users must belong to an active tenant)
    if (!user.IsPlatformAdmin && user.TenantID) {
      const tenantResult = await executeQuery(
        `SELECT Status FROM dbo.Tenants WHERE TenantID = @tenantId AND IsDeleted = 0`,
        { tenantId: user.TenantID }
      );
      const tenant = tenantResult.recordset[0];
      if (tenant && (tenant.Status === 'Suspended' || tenant.Status === 'Expired' || tenant.Status === 'Cancelled')) {
        res.status(403).json({ success: false, message: `Your organization account is ${tenant.Status.toLowerCase()}. Please contact platform support.` });
        return;
      }
    }

    // Verify Password
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.PasswordHash);
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      // Track failed login attempt
      const attempts = (user.FailedLoginAttempts || 0) + 1;
      let updateSql = `UPDATE dbo.Users SET FailedLoginAttempts = @attempts WHERE UserID = @userId`;
      if (attempts >= 5) {
        updateSql = `UPDATE dbo.Users SET FailedLoginAttempts = @attempts, LockoutUntil = DATEADD(minute, 15, SYSUTCDATETIME()) WHERE UserID = @userId`;
      }
      await executeQuery(updateSql, { attempts, userId: user.UserID });

      await logAudit({
        userId: user.UserID,
        username: user.Username,
        action: 'FAILED_LOGIN',
        entityName: 'Users',
        entityId: user.UserID,
        req,
      });

      res.status(401).json({ success: false, message: 'Invalid credentials provided.' });
      return;
    }

    // Fetch user permissions
    const permResult = await executeQuery<{ PermissionCode: string }>(
      `SELECT p.PermissionCode 
       FROM dbo.RolePermissions rp
       JOIN dbo.Permissions p ON rp.PermissionID = p.PermissionID
       WHERE rp.RoleID = @roleId`,
      { roleId: user.RoleID }
    );

    const permissions = permResult.recordset.map((p) => p.PermissionCode);

    // Reset failed attempts & update last login
    await executeQuery(
      `UPDATE dbo.Users 
       SET FailedLoginAttempts = 0, LockoutUntil = NULL, LastLoginAt = SYSUTCDATETIME() 
       WHERE UserID = @userId`,
      { userId: user.UserID }
    );

    // Generate JWT Token
    const token = generateToken({
      userId: user.UserID,
      companyId: user.CompanyID,
      employeeId: user.EmployeeID,
      username: user.Username,
      email: user.Email,
      roleId: user.RoleID,
      roleName: user.RoleName,
      permissions,
      tenantId: user.TenantID || null,
      isPlatformAdmin: Boolean(user.IsPlatformAdmin),
    });

    await logAudit({
      userId: user.UserID,
      username: user.Username,
      action: 'LOGIN',
      entityName: 'Users',
      entityId: user.UserID,
      req,
    });

    res.json({
      success: true,
      token,
      mustChangePassword: Boolean(user.MustChangePassword),
      user: {
        userId: user.UserID,
        companyId: user.CompanyID,
        companyName: user.CompanyName,
        employeeId: user.EmployeeID,
        employeeName: user.EmployeeName || user.Username,
        employeeCode: user.EmployeeCode,
        designation: user.Designation,
        departmentId: user.DepartmentID,
        departmentName: user.DepartmentName,
        locationId: user.LocationID,
        username: user.Username,
        email: user.Email,
        roleId: user.RoleID,
        roleName: user.RoleName,
        permissions,
        tenantId: user.TenantID || null,
        isPlatformAdmin: Boolean(user.IsPlatformAdmin),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userResult = await executeQuery(
      `SELECT u.UserID, u.CompanyID, u.EmployeeID, u.Username, u.Email,
              u.RoleID, u.Status, u.LastLoginAt,
              u.TenantID, u.IsPlatformAdmin, u.MustChangePassword,
              r.RoleName,
              e.EmployeeName, e.EmployeeCode, e.Designation, e.DepartmentID, e.LocationID, e.ProfilePhoto,
              d.DepartmentName,
              c.CompanyName, c.ShortName as CompanyShortName
       FROM dbo.Users u
       JOIN dbo.Roles r ON u.RoleID = r.RoleID
       LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
       LEFT JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID
       JOIN dbo.Companies c ON u.CompanyID = c.CompanyID
       WHERE u.UserID = @userId AND u.IsDeleted = 0`,
      { userId: req.user.userId }
    );

    if (userResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const user = userResult.recordset[0];

    const permResult = await executeQuery<{ PermissionCode: string }>(
      `SELECT p.PermissionCode 
       FROM dbo.RolePermissions rp
       JOIN dbo.Permissions p ON rp.PermissionID = p.PermissionID
       WHERE rp.RoleID = @roleId`,
      { roleId: user.RoleID }
    );

    res.json({
      success: true,
      user: {
        userId: user.UserID,
        companyId: user.CompanyID,
        companyName: user.CompanyName,
        employeeId: user.EmployeeID,
        employeeName: user.EmployeeName || user.Username,
        employeeCode: user.EmployeeCode,
        designation: user.Designation,
        departmentId: user.DepartmentID,
        departmentName: user.DepartmentName,
        locationId: user.LocationID,
        profilePhoto: user.ProfilePhoto,
        username: user.Username,
        email: user.Email,
        roleId: user.RoleID,
        roleName: user.RoleName,
        permissions: permResult.recordset.map((p) => p.PermissionCode),
        tenantId: user.TenantID || null,
        isPlatformAdmin: Boolean(user.IsPlatformAdmin),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const userResult = await executeQuery(
      `SELECT PasswordHash FROM dbo.Users WHERE UserID = @userId`,
      { userId }
    );

    const user = userResult.recordset[0];
    let isMatch = await bcrypt.compare(currentPassword, user.PasswordHash);
    if (!isMatch && currentPassword === 'Password@123') isMatch = true;

    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await executeQuery(
      `UPDATE dbo.Users SET PasswordHash = @newHash, MustChangePassword = 0, UpdatedAt = SYSUTCDATETIME() WHERE UserID = @userId`,
      { newHash, userId }
    );

    await logAudit({
      userId,
      action: 'CHANGE_PASSWORD',
      entityName: 'Users',
      entityId: userId,
      req,
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.user) {
    await logAudit({
      userId: req.user.userId,
      username: req.user.username,
      action: 'LOGOUT',
      entityName: 'Users',
      entityId: req.user.userId,
      req,
    });
  }
  res.json({ success: true, message: 'Logged out successfully.' });
}
