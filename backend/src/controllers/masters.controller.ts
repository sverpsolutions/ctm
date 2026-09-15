import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../config/db';
import { logAudit } from '../services/audit.service';

// --- COMPANIES ---
export async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.tenant?.activeCompanyId || req.user!.companyId;
    const result = await executeQuery<any>(
      `SELECT c.*, p.CompanyName AS ParentCompanyName 
       FROM dbo.Companies c 
       LEFT JOIN dbo.Companies p ON c.ParentCompanyID = p.CompanyID
       WHERE c.CompanyID = @companyId`,
      { companyId }
    );
    const comp = result.recordset[0];
    if (comp && comp.EnabledModules && typeof comp.EnabledModules === 'string') {
      try {
        comp.EnabledModules = JSON.parse(comp.EnabledModules);
      } catch {}
    }
    res.json({ success: true, data: comp });
  } catch (err) {
    next(err);
  }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.tenant?.activeCompanyId || req.user!.companyId;
    const userId = req.user!.userId;
    const { companyName, shortName, legalName, companyType, parentCompanyId, address, city, state, country, pinCode, phone, email, website, gstin, pan, logo, financialYear, timeZone } = req.body;

    await executeQuery(
      `UPDATE dbo.Companies SET
        CompanyName = ISNULL(@companyName, CompanyName),
        ShortName = ISNULL(@shortName, ShortName),
        LegalName = ISNULL(@legalName, LegalName),
        CompanyType = ISNULL(@companyType, CompanyType),
        ParentCompanyID = @parentCompanyId,
        Address = @address,
        City = @city,
        State = @state,
        Country = @country,
        PINCode = @pinCode,
        Phone = @phone,
        Email = @email,
        Website = @website,
        GSTIN = @gstin,
        PAN = @pan,
        Logo = @logo,
        FinancialYear = @financialYear,
        TimeZone = @timeZone,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
       WHERE CompanyID = @companyId`,
      {
        companyId,
        companyName: companyName || null,
        shortName: shortName || null,
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
        financialYear: financialYear || null,
        timeZone: timeZone || null,
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

    res.json({ success: true, message: 'Company settings updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// --- LOCATIONS ---
export async function getLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scopeIds = req.tenant?.scopeCompanyIds || [req.user!.companyId];
    const lScope = scopeIds.length === 1 ? `l.CompanyID = ${scopeIds[0]}` : `l.CompanyID IN (${scopeIds.join(', ')})`;

    const result = await executeQuery(
      `SELECT l.*, c.CompanyName, c.CompanyCode
       FROM dbo.Locations l
       JOIN dbo.Companies c ON l.CompanyID = c.CompanyID
       WHERE ${lScope} AND l.IsDeleted = 0 
       ORDER BY l.LocationName ASC`
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

export async function createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.tenant?.activeCompanyId || req.user!.companyId;
    const { locationCode, locationName, address, city, state, contactPerson, phone, email } = req.body;

    if (!locationCode || !locationName) {
      res.status(400).json({ success: false, message: 'Location code and name are required.' });
      return;
    }

    const result = await executeQuery<{ LocationID: number }>(
      `INSERT INTO dbo.Locations (
        CompanyID, LocationCode, LocationName, Address, City, State, ContactPerson, Phone, Email, Status, CreatedAt, UpdatedAt
      )
      OUTPUT INSERTED.LocationID
      VALUES (
        @companyId, @locationCode, @locationName, @address, @city, @state, @contactPerson, @phone, @email, N'Active', SYSUTCDATETIME(), SYSUTCDATETIME()
      )`,
      {
        companyId,
        locationCode: locationCode.trim(),
        locationName: locationName.trim(),
        address: address || null,
        city: city || null,
        state: state || null,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Location created successfully.',
      locationId: result.recordset[0].LocationID,
    });
  } catch (err) {
    next(err);
  }
}

// --- DEPARTMENTS ---
export async function getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scopeIds = req.tenant?.scopeCompanyIds || [req.user!.companyId];
    const dScope = scopeIds.length === 1 ? `d.CompanyID = ${scopeIds[0]}` : `d.CompanyID IN (${scopeIds.join(', ')})`;

    const result = await executeQuery(
      `SELECT d.*, e.EmployeeName AS DepartmentHeadName, c.CompanyName, c.CompanyCode
       FROM dbo.Departments d
       JOIN dbo.Companies c ON d.CompanyID = c.CompanyID
       LEFT JOIN dbo.Employees e ON d.DepartmentHeadID = e.EmployeeID
       WHERE ${dScope} AND d.IsDeleted = 0
       ORDER BY d.DepartmentName ASC`
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.tenant?.activeCompanyId || req.user!.companyId;
    const { departmentCode, departmentName, departmentHeadId } = req.body;

    if (!departmentCode || !departmentName) {
      res.status(400).json({ success: false, message: 'Department code and name are required.' });
      return;
    }

    const result = await executeQuery<{ DepartmentID: number }>(
      `INSERT INTO dbo.Departments (
        CompanyID, DepartmentCode, DepartmentName, DepartmentHeadID, Status, CreatedAt, UpdatedAt
      )
      OUTPUT INSERTED.DepartmentID
      VALUES (
        @companyId, @departmentCode, @departmentName, @departmentHeadId, N'Active', SYSUTCDATETIME(), SYSUTCDATETIME()
      )`,
      {
        companyId,
        departmentCode: departmentCode.trim(),
        departmentName: departmentName.trim(),
        departmentHeadId: departmentHeadId ? parseInt(departmentHeadId, 10) : null,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      departmentId: result.recordset[0].DepartmentID,
    });
  } catch (err) {
    next(err);
  }
}

// --- EMPLOYEES ---
export async function getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scopeIds = req.tenant?.scopeCompanyIds || [req.user!.companyId];
    const eScope = scopeIds.length === 1 ? `e.CompanyID = ${scopeIds[0]}` : `e.CompanyID IN (${scopeIds.join(', ')})`;

    const result = await executeQuery(
      `SELECT 
        e.*,
        d.DepartmentName,
        l.LocationName,
        m.EmployeeName AS ManagerName,
        u.UserID, u.Username, u.RoleID, r.RoleName,
        c.CompanyName, c.CompanyCode
       FROM dbo.Employees e
       JOIN dbo.Companies c ON e.CompanyID = c.CompanyID
       LEFT JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID
       LEFT JOIN dbo.Locations l ON e.LocationID = l.LocationID
       LEFT JOIN dbo.Employees m ON e.ManagerID = m.EmployeeID
       LEFT JOIN dbo.Users u ON e.EmployeeID = u.EmployeeID AND u.IsDeleted = 0
       LEFT JOIN dbo.Roles r ON u.RoleID = r.RoleID
       WHERE ${eScope} AND e.IsDeleted = 0
       ORDER BY e.EmployeeName ASC`
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.tenant?.activeCompanyId || req.user!.companyId;
    const userId = req.user!.userId;
    const {
      employeeCode,
      employeeName,
      departmentId,
      designation,
      locationId,
      mobile,
      email,
      joiningDate,
      birthday,
      workAnniversary,
      managerId,
      createUserAccount = false,
      roleId,
      password = 'Password@123',
    } = req.body;

    if (!employeeCode || !employeeName || !email) {
      res.status(400).json({ success: false, message: 'Employee code, name, and email are required.' });
      return;
    }

    const empResult = await executeQuery<{ EmployeeID: number }>(
      `INSERT INTO dbo.Employees (
        CompanyID, EmployeeCode, EmployeeName, DepartmentID, Designation, LocationID,
        Mobile, Email, JoiningDate, Birthday, WorkAnniversary, ManagerID, Status, CreatedAt, UpdatedAt
      )
      OUTPUT INSERTED.EmployeeID
      VALUES (
        @companyId, @employeeCode, @employeeName, @departmentId, @designation, @locationId,
        @mobile, @email, @joiningDate, @birthday, @workAnniversary, @managerId, N'Active', SYSUTCDATETIME(), SYSUTCDATETIME()
      )`,
      {
        companyId,
        employeeCode: employeeCode.trim(),
        employeeName: employeeName.trim(),
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        designation: designation || null,
        locationId: locationId ? parseInt(locationId, 10) : null,
        mobile: mobile || null,
        email: email.trim(),
        joiningDate: joiningDate || null,
        birthday: birthday || null,
        workAnniversary: workAnniversary || null,
        managerId: managerId ? parseInt(managerId, 10) : null,
      }
    );

    const newEmpId = empResult.recordset[0].EmployeeID;

    // Optional user account creation
    if (createUserAccount && roleId) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const userInsert = await executeQuery<{ UserID: number }>(
        `INSERT INTO dbo.Users (
          CompanyID, EmployeeID, Username, Email, PasswordHash, RoleID, Status, CreatedAt, UpdatedAt
        )
        OUTPUT INSERTED.UserID
        VALUES (
          @companyId, @newEmpId, @email, @email, @passwordHash, @roleId, N'Active', SYSUTCDATETIME(), SYSUTCDATETIME()
        )`,
        {
          companyId,
          newEmpId,
          email: email.trim(),
          passwordHash,
          roleId: parseInt(roleId, 10),
        }
      );

      const newUserId = userInsert.recordset[0].UserID;

      // Map user in UserCompany table
      await executeQuery(
        `INSERT INTO dbo.UserCompany (UserID, CompanyID, RoleID, AccessScope, IsPrimary, IsActive)
         VALUES (@newUserId, @companyId, @roleId, N'Own', 1, 1)`,
        { newUserId, companyId, roleId: parseInt(roleId, 10) }
      );
    }

    await logAudit({
      userId,
      action: 'CREATE_EMPLOYEE',
      entityName: 'Employees',
      entityId: newEmpId,
      newValues: { employeeCode, employeeName, email, designation },
      req,
    });

    res.status(201).json({ success: true, message: 'Employee created successfully.', employeeId: newEmpId });
  } catch (err) {
    next(err);
  }
}

// --- ROLES & PERMISSIONS ---
export async function getRolesAndPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = await executeQuery(`SELECT * FROM dbo.Roles ORDER BY RoleID ASC`);
    const permissions = await executeQuery(`SELECT * FROM dbo.Permissions ORDER BY ModuleName ASC, PermissionCode ASC`);
    const rolePerms = await executeQuery(`SELECT RoleID, PermissionID FROM dbo.RolePermissions`);

    res.json({
      success: true,
      data: {
        roles: roles.recordset,
        permissions: permissions.recordset,
        rolePermissions: rolePerms.recordset,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleId = parseInt(req.params.roleId, 10);
    const { permissionIds } = req.body;
    const userId = req.user!.userId;

    if (!Array.isArray(permissionIds)) {
      res.status(400).json({ success: false, message: 'Permission IDs array is required.' });
      return;
    }

    // Delete existing
    await executeQuery(`DELETE FROM dbo.RolePermissions WHERE RoleID = @roleId`, { roleId });

    // Insert new
    for (const pId of permissionIds) {
      await executeQuery(
        `INSERT INTO dbo.RolePermissions (RoleID, PermissionID) VALUES (@roleId, @pId)`,
        { roleId, pId: parseInt(pId, 10) }
      );
    }

    await logAudit({
      userId,
      action: 'UPDATE_ROLE_PERMISSIONS',
      entityName: 'Roles',
      entityId: roleId,
      newValues: { permissionIds },
      req,
    });

    res.json({ success: true, message: 'Role permissions updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// --- USERS ---
export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scopeIds = req.tenant?.scopeCompanyIds || [req.user!.companyId];
    const isSuperAdmin = req.tenant?.isSuperAdmin;
    const uScope = isSuperAdmin ? '1=1' : (scopeIds.length === 1 ? `u.CompanyID = ${scopeIds[0]}` : `u.CompanyID IN (${scopeIds.join(', ')})`);

    const users = await executeQuery(
      `SELECT 
        u.UserID, u.CompanyID, u.Username, u.Email, u.Status, u.LastLoginAt, u.FailedLoginAttempts, u.CreatedAt,
        r.RoleID, r.RoleName,
        e.EmployeeID, e.EmployeeName, e.EmployeeCode, e.Designation,
        c.CompanyName, c.CompanyCode
       FROM dbo.Users u
       JOIN dbo.Roles r ON u.RoleID = r.RoleID
       LEFT JOIN dbo.Companies c ON u.CompanyID = c.CompanyID
       LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
       WHERE ${uScope} AND u.IsDeleted = 0
       ORDER BY u.CreatedAt DESC`
    );

    res.json({ success: true, data: users.recordset });
  } catch (err) {
    next(err);
  }
}
