import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../config/db';
import { logAudit } from '../services/audit.service';
import { sendNotification } from '../services/notification.service';

export async function getImportantDates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const {
      page = '1',
      limit = '25',
      search,
      categoryId,
      departmentId,
      locationId,
      status,
      timeframe, // critical (0-3d), urgent (4-7d), upcoming (8-30d), future (31+d), expired, all
      sortBy = 'ExpiryDate',
      sortOrder = 'ASC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const scopeIds = req.tenant?.scopeCompanyIds || [req.user!.companyId];
    const dScope = scopeIds.length === 1 ? `d.CompanyID = ${scopeIds[0]}` : `d.CompanyID IN (${scopeIds.join(', ')})`;
    let whereClauses: string[] = [dScope, 'd.IsDeleted = 0'];
    const params: Record<string, any> = { limitNum, offset };

    if (search) {
      whereClauses.push(`(
        d.Title LIKE @search OR 
        d.Description LIKE @search OR 
        d.ReferenceNumber LIKE @search OR 
        d.RelatedVendor LIKE @search OR 
        d.RelatedCustomer LIKE @search
      )`);
      params.search = `%${search}%`;
    }

    if (categoryId) {
      whereClauses.push(`d.CategoryID = @categoryId`);
      params.categoryId = parseInt(categoryId as string, 10);
    }

    if (departmentId) {
      whereClauses.push(`d.DepartmentID = @departmentId`);
      params.departmentId = parseInt(departmentId as string, 10);
    }

    if (locationId) {
      whereClauses.push(`d.LocationID = @locationId`);
      params.locationId = parseInt(locationId as string, 10);
    }

    if (status) {
      whereClauses.push(`d.Status = @status`);
      params.status = status;
    }

    // Smart Timeframe classification filters
    if (timeframe === 'critical') {
      whereClauses.push(`DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 0 AND 3 AND d.Status = 'Active'`);
    } else if (timeframe === 'urgent') {
      whereClauses.push(`DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 4 AND 7 AND d.Status = 'Active'`);
    } else if (timeframe === 'upcoming') {
      whereClauses.push(`DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 8 AND 30 AND d.Status = 'Active'`);
    } else if (timeframe === 'future') {
      whereClauses.push(`DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) > 30 AND d.Status = 'Active'`);
    } else if (timeframe === 'expired') {
      whereClauses.push(`ISNULL(d.ExpiryDate, d.Date) < CAST(GETDATE() AS DATE) AND d.Status = 'Active'`);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total Count
    const countResult = await executeQuery<{ Total: number }>(
      `SELECT COUNT(*) AS Total 
       FROM dbo.ImportantDates d
       WHERE ${whereSql}`,
      params
    );
    const totalRecords = countResult.recordset[0]?.Total || 0;

    // Sorting
    const sortField = sortBy === 'Title' ? 'd.Title' : sortBy === 'Date' ? 'd.Date' : 'ISNULL(d.ExpiryDate, d.Date)';
    const orderDir = (sortOrder as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const dataResult = await executeQuery(
      `SELECT 
        d.ImportantDateID, d.CompanyID, d.LocationID, d.DepartmentID, d.CategoryID,
        d.Title, d.Description, d.RelatedEmployeeID, d.RelatedVendor, d.RelatedCustomer,
        d.ReferenceNumber, d.Date, d.StartDate, d.ExpiryDate, d.RecurrenceType,
        d.ResponsibleEmployeeID, d.Priority, d.Attachment, d.Notes,
        d.AutoGenerateTask, d.LeadDaysForTask, d.TaskAssignedToID, d.GeneratedTaskID,
        d.Status, d.CreatedAt, d.UpdatedAt,
        c.CategoryName, c.ColorCode AS CategoryColor, c.IconName AS CategoryIcon,
        e.EmployeeName AS ResponsiblePersonName, e.Email AS ResponsiblePersonEmail,
        relE.EmployeeName AS RelatedEmployeeName,
        dep.DepartmentName,
        l.LocationName,
        gt.TaskNumber AS GeneratedTaskNumber,
        gt.Status AS GeneratedTaskStatus,
        gt.TaskTitle AS GeneratedTaskTitle,
        DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) AS DaysRemaining,
        CASE
          WHEN ISNULL(d.ExpiryDate, d.Date) < CAST(GETDATE() AS DATE) THEN 'Expired'
          WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 0 AND 3 THEN 'Critical'
          WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 4 AND 7 THEN 'Urgent'
          WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 8 AND 30 THEN 'Upcoming'
          ELSE 'Future'
        END AS SmartCategory
       FROM dbo.ImportantDates d
       JOIN dbo.ImportantDateCategories c ON d.CategoryID = c.CategoryID
       LEFT JOIN dbo.Employees e ON d.ResponsibleEmployeeID = e.EmployeeID
       LEFT JOIN dbo.Employees relE ON d.RelatedEmployeeID = relE.EmployeeID
       LEFT JOIN dbo.Departments dep ON d.DepartmentID = dep.DepartmentID
       LEFT JOIN dbo.Locations l ON d.LocationID = l.LocationID
       LEFT JOIN dbo.Tasks gt ON d.GeneratedTaskID = gt.TaskID
       WHERE ${whereSql}
       ORDER BY ${sortField} ${orderDir}
       OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY`,
      params
    );

    res.json({
      success: true,
      data: dataResult.recordset,
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

export async function getImportantDateById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const companyId = req.user!.companyId;

    const dateResult = await executeQuery(
      `SELECT 
        d.*,
        c.CategoryName, c.ColorCode AS CategoryColor, c.IconName AS CategoryIcon,
        e.EmployeeName AS ResponsiblePersonName, e.Email AS ResponsiblePersonEmail,
        relE.EmployeeName AS RelatedEmployeeName,
        dep.DepartmentName,
        l.LocationName,
        u.Username AS CreatedByUsername,
        DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) AS DaysRemaining
       FROM dbo.ImportantDates d
       JOIN dbo.ImportantDateCategories c ON d.CategoryID = c.CategoryID
       LEFT JOIN dbo.Employees e ON d.ResponsibleEmployeeID = e.EmployeeID
       LEFT JOIN dbo.Employees relE ON d.RelatedEmployeeID = relE.EmployeeID
       LEFT JOIN dbo.Departments dep ON d.DepartmentID = dep.DepartmentID
       LEFT JOIN dbo.Locations l ON d.LocationID = l.LocationID
       LEFT JOIN dbo.Users u ON d.CreatedBy = u.UserID
       WHERE d.ImportantDateID = @id AND d.IsDeleted = 0`,
      { id }
    );

    if (dateResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Important Date record not found.' });
      return;
    }

    const dateRecord = dateResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin;
    if (!isSuperAdmin && !req.tenant?.scopeCompanyIds.includes(dateRecord.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this company\'s important date.' });
      return;
    }

    // Reminders configured
    const remindersResult = await executeQuery(
      `SELECT * FROM dbo.ImportantDateReminders WHERE ImportantDateID = @id ORDER BY DaysBefore DESC`,
      { id }
    );

    // Renewal History
    const historyResult = await executeQuery(
      `SELECT h.*, u.Username AS RenewedByUsername
       FROM dbo.ImportantDateHistory h
       LEFT JOIN dbo.Users u ON h.RenewedByUserID = u.UserID
       WHERE h.ImportantDateID = @id
       ORDER BY h.RenewedDate DESC`,
      { id }
    );

    // Related Tasks
    const tasksResult = await executeQuery(
      `SELECT TaskID, TaskNumber, TaskTitle, Status, Priority, DueDate, PercentageComplete
       FROM dbo.Tasks
       WHERE RelatedImportantDateID = @id AND IsDeleted = 0
       ORDER BY DueDate ASC`,
      { id }
    );

    res.json({
      success: true,
      data: {
        ...dateRecord,
        reminders: remindersResult.recordset,
        renewalHistory: historyResult.recordset,
        relatedTasks: tasksResult.recordset,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createImportantDate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const {
      categoryId,
      title,
      description,
      locationId,
      departmentId,
      relatedEmployeeId,
      relatedVendor,
      relatedCustomer,
      referenceNumber,
      date,
      startDate,
      expiryDate,
      recurrenceType = 'Does Not Repeat',
      responsibleEmployeeId,
      priority = 'Medium',
      notes,
      attachment,
      autoGenerateTask = false,
      leadDaysForTask = 15,
      taskAssignedToId,
      reminders = [30, 15, 7, 1], // default reminder days
    } = req.body;

    if (!categoryId || !title || !date) {
      res.status(400).json({ success: false, message: 'Category, title, and date are required.' });
      return;
    }

    const insertResult = await executeQuery<{ ImportantDateID: number }>(
      `INSERT INTO dbo.ImportantDates (
        CompanyID, LocationID, DepartmentID, CategoryID, Title, Description,
        RelatedEmployeeID, RelatedVendor, RelatedCustomer, ReferenceNumber,
        Date, StartDate, ExpiryDate, RecurrenceType, ResponsibleEmployeeID,
        Priority, Notes, Attachment, AutoGenerateTask, LeadDaysForTask,
        TaskAssignedToID, Status, CreatedBy, CreatedAt, UpdatedAt
      )
      OUTPUT INSERTED.ImportantDateID
      VALUES (
        @companyId, @locationId, @departmentId, @categoryId, @title, @description,
        @relatedEmployeeId, @relatedVendor, @relatedCustomer, @referenceNumber,
        @date, @startDate, @expiryDate, @recurrenceType, @responsibleEmployeeId,
        @priority, @notes, @attachment, @autoGenerateTask, @leadDaysForTask,
        @taskAssignedToId, N'Active', @userId, SYSUTCDATETIME(), SYSUTCDATETIME()
      )`,
      {
        companyId,
        locationId: locationId || null,
        departmentId: departmentId || null,
        categoryId: parseInt(categoryId, 10),
        title: title.trim(),
        description: description || null,
        relatedEmployeeId: relatedEmployeeId || null,
        relatedVendor: relatedVendor || null,
        relatedCustomer: relatedCustomer || null,
        referenceNumber: referenceNumber || null,
        date,
        startDate: startDate || null,
        expiryDate: expiryDate || date,
        recurrenceType,
        responsibleEmployeeId: responsibleEmployeeId || null,
        priority,
        notes: notes || null,
        attachment: attachment || null,
        autoGenerateTask: autoGenerateTask ? 1 : 0,
        leadDaysForTask: parseInt(leadDaysForTask, 10) || 15,
        taskAssignedToId: taskAssignedToId || responsibleEmployeeId || null,
        userId,
      }
    );

    const newDateId = insertResult.recordset[0].ImportantDateID;

    // Add Reminders
    if (Array.isArray(reminders)) {
      for (const days of reminders) {
        await executeQuery(
          `INSERT INTO dbo.ImportantDateReminders (ImportantDateID, DaysBefore, ReminderChannel)
           VALUES (@newDateId, @days, N'In-App')`,
          { newDateId, days: parseInt(days, 10) }
        );
      }
    }

    await logAudit({
      userId,
      action: 'CREATE_IMPORTANT_DATE',
      entityName: 'ImportantDates',
      entityId: newDateId,
      newValues: { title, date, expiryDate, categoryId, priority },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Important Date record created successfully.',
      importantDateId: newDateId,
      data: { ImportantDateID: newDateId },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateImportantDate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const {
      categoryId,
      title,
      description,
      locationId,
      departmentId,
      relatedEmployeeId,
      relatedVendor,
      relatedCustomer,
      referenceNumber,
      date,
      startDate,
      expiryDate,
      recurrenceType,
      responsibleEmployeeId,
      priority,
      notes,
      attachment,
      status,
      autoGenerateTask,
      leadDaysForTask,
      taskAssignedToId,
    } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM dbo.ImportantDates WHERE ImportantDateID = @id AND IsDeleted = 0`,
      { id }
    );

    if (existing.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Important Date not found.' });
      return;
    }

    const old = existing.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin;
    if (!isSuperAdmin && !req.tenant?.scopeCompanyIds.includes(old.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to update this company\'s date.' });
      return;
    }

    await executeQuery(
      `UPDATE dbo.ImportantDates SET
        CategoryID = ISNULL(@categoryId, CategoryID),
        Title = ISNULL(@title, Title),
        Description = @description,
        LocationID = @locationId,
        DepartmentID = @departmentId,
        RelatedEmployeeID = @relatedEmployeeId,
        RelatedVendor = @relatedVendor,
        RelatedCustomer = @relatedCustomer,
        ReferenceNumber = @referenceNumber,
        Date = ISNULL(@date, Date),
        StartDate = @startDate,
        ExpiryDate = ISNULL(@expiryDate, ExpiryDate),
        RecurrenceType = ISNULL(@recurrenceType, RecurrenceType),
        ResponsibleEmployeeID = @responsibleEmployeeId,
        Priority = ISNULL(@priority, Priority),
        Notes = @notes,
        Attachment = @attachment,
        Status = ISNULL(@status, Status),
        AutoGenerateTask = ISNULL(@autoGenerateTask, AutoGenerateTask),
        LeadDaysForTask = ISNULL(@leadDaysForTask, LeadDaysForTask),
        TaskAssignedToID = @taskAssignedToId,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
       WHERE ImportantDateID = @id`,
      {
        id,
        categoryId: categoryId || null,
        title: title || null,
        description: description !== undefined ? description : old.Description,
        locationId: locationId || null,
        departmentId: departmentId || null,
        relatedEmployeeId: relatedEmployeeId || null,
        relatedVendor: relatedVendor || null,
        relatedCustomer: relatedCustomer || null,
        referenceNumber: referenceNumber || null,
        date: date || null,
        startDate: startDate || null,
        expiryDate: expiryDate || null,
        recurrenceType: recurrenceType || null,
        responsibleEmployeeId: responsibleEmployeeId || null,
        priority: priority || null,
        notes: notes !== undefined ? notes : old.Notes,
        attachment: attachment || null,
        status: status || null,
        autoGenerateTask: autoGenerateTask !== undefined ? (autoGenerateTask ? 1 : 0) : null,
        leadDaysForTask: leadDaysForTask !== undefined ? parseInt(leadDaysForTask, 10) : null,
        taskAssignedToId: taskAssignedToId || null,
        userId,
      }
    );

    await logAudit({
      userId,
      action: 'UPDATE_IMPORTANT_DATE',
      entityName: 'ImportantDates',
      entityId: id,
      oldValues: old,
      newValues: req.body,
      req,
    });

    res.json({ success: true, message: 'Important Date updated successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function renewImportantDate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { newExpiryDate, renewedDate, remarks, attachmentUrl } = req.body;

    if (!newExpiryDate || !renewedDate) {
      res.status(400).json({ success: false, message: 'New Expiry Date and Renewal Date are required.' });
      return;
    }

    const dateResult = await executeQuery(
      `SELECT * FROM dbo.ImportantDates WHERE ImportantDateID = @id AND IsDeleted = 0`,
      { id }
    );

    if (dateResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Important Date record not found.' });
      return;
    }

    const current = dateResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin;
    if (!isSuperAdmin && !req.tenant?.scopeCompanyIds.includes(current.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to renew this company\'s date.' });
      return;
    }
    const prevExpiry = current.ExpiryDate || current.Date;

    // 1. Insert history record
    await executeQuery(
      `INSERT INTO dbo.ImportantDateHistory (
        ImportantDateID, PreviousExpiryDate, NewExpiryDate, RenewedDate, RenewedByUserID, Remarks, AttachmentURL, CreatedAt
      ) VALUES (
        @id, @prevExpiry, @newExpiryDate, @renewedDate, @userId, @remarks, @attachmentUrl, SYSUTCDATETIME()
      )`,
      {
        id,
        prevExpiry,
        newExpiryDate,
        renewedDate,
        userId,
        remarks: remarks || null,
        attachmentUrl: attachmentUrl || null,
      }
    );

    // 2. Update ImportantDate record with new expiry date & Active status
    await executeQuery(
      `UPDATE dbo.ImportantDates SET
        ExpiryDate = @newExpiryDate,
        Date = @newExpiryDate,
        Status = N'Active',
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
       WHERE ImportantDateID = @id`,
      { id, newExpiryDate, userId }
    );

    await logAudit({
      userId,
      action: 'RENEW_IMPORTANT_DATE',
      entityName: 'ImportantDates',
      entityId: id,
      newValues: { prevExpiry, newExpiryDate, renewedDate, remarks },
      req,
    });

    res.json({
      success: true,
      message: `Important Date renewed successfully. New expiry date: ${newExpiryDate}.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteImportantDate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const existing = await executeQuery(
      `SELECT ImportantDateID, CompanyID FROM dbo.ImportantDates WHERE ImportantDateID = @id AND IsDeleted = 0`,
      { id }
    );

    if (existing.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Important Date not found.' });
      return;
    }

    const dateRecord = existing.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin;
    if (!isSuperAdmin && !req.tenant?.scopeCompanyIds.includes(dateRecord.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to delete this company\'s date.' });
      return;
    }

    await executeQuery(
      `UPDATE dbo.ImportantDates SET IsDeleted = 1, UpdatedBy = @userId, UpdatedAt = SYSUTCDATETIME() 
       WHERE ImportantDateID = @id`,
      { id, userId }
    );

    await logAudit({
      userId,
      action: 'DELETE_IMPORTANT_DATE',
      entityName: 'ImportantDates',
      entityId: id,
      req,
    });

    res.json({ success: true, message: 'Important Date deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const categories = await executeQuery(
      `SELECT * FROM dbo.ImportantDateCategories 
       WHERE (CompanyID = @companyId OR CompanyID IS NULL) AND Status = 'Active'
       ORDER BY IsSystemDefault DESC, CategoryName ASC`,
      { companyId }
    );
    res.json({ success: true, data: categories.recordset });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const { categoryName, colorCode = '#3b82f6', iconName = 'Calendar' } = req.body;

    if (!categoryName) {
      res.status(400).json({ success: false, message: 'Category name is required.' });
      return;
    }

    const insertResult = await executeQuery<{ CategoryID: number }>(
      `INSERT INTO dbo.ImportantDateCategories (CompanyID, CategoryName, ColorCode, IconName, IsSystemDefault, Status, CreatedAt)
       OUTPUT INSERTED.CategoryID
       VALUES (@companyId, @categoryName, @colorCode, @iconName, 0, N'Active', SYSUTCDATETIME())`,
      { companyId, categoryName: categoryName.trim(), colorCode, iconName }
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      categoryId: insertResult.recordset[0].CategoryID,
    });
  } catch (err) {
    next(err);
  }
}
