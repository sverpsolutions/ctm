import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../config/db';

export async function validateRegistrationToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;

    const result = await executeQuery<any>(
      `SELECT RegistrationID, Status, TokenExpiresAt, CompanyName, ContactPerson, ContactEmail
       FROM dbo.TenantRegistrations
       WHERE RegistrationToken = @token`,
      { token }
    );

    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid registration link.' });
      return;
    }

    const reg = result.recordset[0];

    if (reg.Status === 'Approved') {
      res.status(400).json({ success: false, message: 'This registration has already been approved.' });
      return;
    }
    if (reg.Status === 'Rejected') {
      res.status(400).json({ success: false, message: 'This registration was rejected.' });
      return;
    }
    if (reg.Status === 'Expired' || new Date(reg.TokenExpiresAt) < new Date()) {
      res.status(400).json({ success: false, message: 'This registration link has expired.' });
      return;
    }

    const isNew = reg.Status === 'LinkGenerated';

    res.json({
      success: true,
      valid: true,
      isNew,
      registration: isNew ? null : {
        companyName: reg.CompanyName,
        contactPerson: reg.ContactPerson,
        contactEmail: reg.ContactEmail,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function submitRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;
    const {
      companyName, legalName, contactPerson, contactEmail, contactMobile,
      address, city, state, country, pinCode, gstin, pan, website, industry,
      companyType, numBranches, numUsers, requestedModules,
      adminName, adminEmail, adminUsername, password,
    } = req.body;

    if (!companyName || !contactPerson || !contactEmail || !password) {
      res.status(400).json({ success: false, message: 'Company name, contact person, contact email, and password are required.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      return;
    }

    const result = await executeQuery<any>(
      `SELECT RegistrationID, Status, TokenExpiresAt FROM dbo.TenantRegistrations WHERE RegistrationToken = @token`,
      { token }
    );

    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Invalid registration link.' });
      return;
    }

    const reg = result.recordset[0];

    if (reg.Status !== 'LinkGenerated' && reg.Status !== 'Pending') {
      res.status(400).json({ success: false, message: `Registration is already ${reg.Status}.` });
      return;
    }
    if (new Date(reg.TokenExpiresAt) < new Date()) {
      res.status(400).json({ success: false, message: 'This registration link has expired.' });
      return;
    }

    // Check if admin username/email already exists
    const existingUser = await executeQuery<any>(
      `SELECT UserID FROM dbo.Users WHERE (Username = @username OR Email = @email) AND IsDeleted = 0`,
      { username: adminUsername || adminEmail || contactEmail, email: adminEmail || contactEmail }
    );
    if (existingUser.recordset.length > 0) {
      res.status(409).json({ success: false, message: 'A user with this username or email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await executeQuery(
      `UPDATE dbo.TenantRegistrations SET
        CompanyName = @companyName, LegalName = @legalName, ContactPerson = @contactPerson,
        ContactEmail = @contactEmail, ContactMobile = @contactMobile,
        Address = @address, City = @city, State = @state, Country = @country, PINCode = @pinCode,
        GSTIN = @gstin, PAN = @pan, Website = @website, Industry = @industry,
        CompanyType = @companyType, NumBranches = @numBranches, NumUsers = @numUsers,
        RequestedModules = @requestedModules,
        AdminName = @adminName, AdminEmail = @adminEmail, AdminUsername = @adminUsername,
        PasswordHash = @passwordHash,
        Status = 'Pending', UpdatedAt = SYSUTCDATETIME()
       WHERE RegistrationID = @regId`,
      {
        regId: reg.RegistrationID,
        companyName: companyName.trim(),
        legalName: legalName || null,
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        contactMobile: contactMobile || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || 'India',
        pinCode: pinCode || null,
        gstin: gstin || null,
        pan: pan || null,
        website: website || null,
        industry: industry || null,
        companyType: companyType || 'Subsidiary',
        numBranches: numBranches || 1,
        numUsers: numUsers || 10,
        requestedModules: requestedModules ? JSON.stringify(requestedModules) : '["tasks","dates","calendar","reports","audit"]',
        adminName: adminName || contactPerson,
        adminEmail: adminEmail || contactEmail,
        adminUsername: adminUsername || adminEmail || contactEmail,
        passwordHash,
      }
    );

    res.json({
      success: true,
      message: 'Registration submitted successfully. Your application is pending review by the platform administrator.',
    });
  } catch (err) {
    next(err);
  }
}
