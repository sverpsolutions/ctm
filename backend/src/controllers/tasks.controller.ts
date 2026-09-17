import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../config/db';
import { logAudit } from '../services/audit.service';
import { sendNotification } from '../services/notification.service';

export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      page = '1',
      limit = '25',
      search,
      status,
      priority,
      departmentId,
      locationId,
      categoryId,
      employeeId,
      myTasks,
      dueDateFrom,
      dueDateTo,
      companyId,
      sortBy = 'DueDate',
      sortOrder = 'ASC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    const scopeIds = req.tenant?.scopeCompanyIds || [req.user!.companyId];

    let whereClauses: string[] = ['t.IsDeleted = 0'];
    const params: Record<string, any> = { limitNum, offset };

    // Strict Company Filter Enforcement
    if (companyId) {
      const filterCompId = parseInt(companyId as string, 10);
      if (!isSuperAdmin && !allowedCompanyIds.includes(filterCompId)) {
        res.status(403).json({
          success: false,
          message: `Forbidden: You do not have permission to access tasks for Company #${filterCompId}.`,
        });
        return;
      }
      whereClauses.push(`t.CompanyID = @filterCompId`);
      params.filterCompId = filterCompId;
    } else {
      if (!isSuperAdmin) {
        if (allowedCompanyIds.length === 1) {
          whereClauses.push(`t.CompanyID = ${allowedCompanyIds[0]}`);
        } else {
          whereClauses.push(`t.CompanyID IN (${allowedCompanyIds.join(', ')})`);
        }
      }
    }

    if (search) {
      whereClauses.push(`(
        t.TaskNumber LIKE @search OR 
        t.TaskTitle LIKE @search OR 
        t.TaskDescription LIKE @search OR 
        t.Tags LIKE @search OR
        t.RelatedVendor LIKE @search OR
        t.RelatedCustomer LIKE @search OR
        comp.CompanyName LIKE @search
      )`);
      params.search = `%${search}%`;
    }

    if (status) {
      if (status === 'Overdue') {
        whereClauses.push(`(t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled')))`);
      } else {
        whereClauses.push(`t.Status = @status`);
        params.status = status;
      }
    }

    if (priority) {
      whereClauses.push(`t.Priority = @priority`);
      params.priority = priority;
    }

    if (departmentId) {
      whereClauses.push(`t.DepartmentID = @departmentId`);
      params.departmentId = parseInt(departmentId as string, 10);
    }

    if (locationId) {
      whereClauses.push(`t.LocationID = @locationId`);
      params.locationId = parseInt(locationId as string, 10);
    }

    if (categoryId) {
      whereClauses.push(`t.CategoryID = @categoryId`);
      params.categoryId = parseInt(categoryId as string, 10);
    }

    if (employeeId || myTasks === 'true') {
      const targetEmpId = myTasks === 'true' ? req.user!.employeeId : parseInt(employeeId as string, 10);
      if (targetEmpId) {
        whereClauses.push(`EXISTS (SELECT 1 FROM dbo.TaskAssignees ta WHERE ta.TaskID = t.TaskID AND ta.EmployeeID = @targetEmpId)`);
        params.targetEmpId = targetEmpId;
      }
    }

    if (dueDateFrom) {
      whereClauses.push(`t.DueDate >= @dueDateFrom`);
      params.dueDateFrom = dueDateFrom;
    }

    if (dueDateTo) {
      whereClauses.push(`t.DueDate <= @dueDateTo`);
      params.dueDateTo = dueDateTo;
    }

    const whereSql = whereClauses.join(' AND ');

    // Safe sorting columns
    const allowedSortCols: Record<string, string> = {
      TaskNumber: 't.TaskNumber',
      TaskTitle: 't.TaskTitle',
      DueDate: 't.DueDate',
      Priority: 't.Priority',
      Status: 't.Status',
      PercentageComplete: 't.PercentageComplete',
      CreatedAt: 't.CreatedAt',
      DepartmentName: 'd.DepartmentName',
      CompanyName: 'comp.CompanyName',
    };
    const sortCol = allowedSortCols[sortBy as string] || 't.DueDate';
    const orderDir = (sortOrder as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Total Count Query
    const countResult = await executeQuery<{ Total: number }>(
      `SELECT COUNT(*) AS Total 
       FROM dbo.Tasks t
       LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
       LEFT JOIN dbo.Companies comp ON t.CompanyID = comp.CompanyID
       WHERE ${whereSql}`,
      params
    );
    const totalRecords = countResult.recordset[0]?.Total || 0;

    // Data query with assignees subquery & dynamic overdue status calculation
    const query = `
      SELECT 
        t.TaskID, t.TaskNumber, t.CompanyID, t.LocationID, t.DepartmentID, t.CategoryID,
        t.TaskTitle, t.TaskDescription, t.TaskType, t.ReminderDate, t.Remarks,
        t.StartDate, t.DueDate, t.Priority,
        t.Status,
        CASE 
          WHEN (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled')) THEN 'Overdue'
          ELSE t.Status 
        END AS EffectiveStatus,
        t.PercentageComplete, t.EstimatedHours, t.ActualHours,
        t.ParentTaskID, t.RelatedImportantDateID, t.RelatedVendor, t.RelatedCustomer, t.Tags,
        t.CompletedDate, t.ApprovedByID, t.ApprovedDate, t.RejectionReason,
        t.CreatedAt, t.UpdatedAt,
        comp.CompanyName, comp.CompanyCode,
        d.DepartmentName,
        l.LocationName,
        c.CategoryName, c.ColorCode AS CategoryColor, c.RequiresApproval,
        m.EmployeeName AS ManagerName,
        u.Username AS AssignedByUsername,
        (SELECT STRING_AGG(e.EmployeeName, ', ') 
         FROM dbo.TaskAssignees ta 
         JOIN dbo.Employees e ON ta.EmployeeID = e.EmployeeID 
         WHERE ta.TaskID = t.TaskID) AS AssigneeNames,
        (SELECT COUNT(*) FROM dbo.TaskChecklist tc WHERE tc.TaskID = t.TaskID) AS TotalChecklistItems,
        (SELECT COUNT(*) FROM dbo.TaskChecklist tc WHERE tc.TaskID = t.TaskID AND tc.IsCompleted = 1) AS CompletedChecklistItems,
        (SELECT COUNT(*) FROM dbo.TaskAttachments att WHERE att.TaskID = t.TaskID) AS AttachmentCount,
        (SELECT COUNT(*) FROM dbo.TaskComments comm WHERE comm.TaskID = t.TaskID) AS CommentCount,
        DATEDIFF(day, CAST(GETDATE() AS DATE), t.DueDate) AS DaysRemaining
      FROM dbo.Tasks t
      LEFT JOIN dbo.Companies comp ON t.CompanyID = comp.CompanyID
      LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
      LEFT JOIN dbo.Locations l ON t.LocationID = l.LocationID
      LEFT JOIN dbo.TaskCategories c ON t.CategoryID = c.CategoryID
      LEFT JOIN dbo.Employees m ON t.ManagerID = m.EmployeeID
      LEFT JOIN dbo.Users u ON t.AssignedByID = u.UserID
      WHERE ${whereSql}
      ORDER BY ${sortCol} ${orderDir}
      OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY
    `;

    const dataResult = await executeQuery(query, params);

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

export async function getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);

    const taskResult = await executeQuery(
      `SELECT 
        t.*,
        CASE 
          WHEN (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled')) THEN 'Overdue'
          ELSE t.Status 
        END AS EffectiveStatus,
        comp.CompanyName, comp.CompanyCode,
        d.DepartmentName,
        l.LocationName,
        c.CategoryName, c.ColorCode AS CategoryColor, c.RequiresApproval,
        m.EmployeeName AS ManagerName, m.Email AS ManagerEmail,
        u.Username AS AssignedByUsername,
        appr.Username AS ApprovedByUsername,
        id.Title AS RelatedDateTitle, id.ExpiryDate AS RelatedDateExpiry,
        DATEDIFF(day, CAST(GETDATE() AS DATE), t.DueDate) AS DaysRemaining
       FROM dbo.Tasks t
       LEFT JOIN dbo.Companies comp ON t.CompanyID = comp.CompanyID
       LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
       LEFT JOIN dbo.Locations l ON t.LocationID = l.LocationID
       LEFT JOIN dbo.TaskCategories c ON t.CategoryID = c.CategoryID
       LEFT JOIN dbo.Employees m ON t.ManagerID = m.EmployeeID
       LEFT JOIN dbo.Users u ON t.AssignedByID = u.UserID
       LEFT JOIN dbo.Users appr ON t.ApprovedByID = appr.UserID
       LEFT JOIN dbo.ImportantDates id ON t.RelatedImportantDateID = id.ImportantDateID
       WHERE t.TaskID = @taskId AND t.IsDeleted = 0`,
      { taskId }
    );

    if (taskResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const task = taskResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(task.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have access to view this company\'s task.' });
      return;
    }

    // Fetch Assignees
    const assigneesResult = await executeQuery(
      `SELECT e.EmployeeID, e.EmployeeName, e.EmployeeCode, e.Email, e.Designation, e.ProfilePhoto
       FROM dbo.TaskAssignees ta
       JOIN dbo.Employees e ON ta.EmployeeID = e.EmployeeID
       WHERE ta.TaskID = @taskId`,
      { taskId }
    );

    // Fetch Checklist Items
    const checklistResult = await executeQuery(
      `SELECT tc.ChecklistItemID, tc.Title, tc.IsCompleted, tc.CompletedAt, tc.SortOrder,
              e.EmployeeName AS CompletedByName
       FROM dbo.TaskChecklist tc
       LEFT JOIN dbo.Employees e ON tc.CompletedByEmployeeID = e.EmployeeID
       WHERE tc.TaskID = @taskId
       ORDER BY tc.SortOrder ASC, tc.ChecklistItemID ASC`,
      { taskId }
    );

    // Fetch Progress Updates History
    const updatesResult = await executeQuery(
      `SELECT tu.UpdateID, tu.PreviousStatus, tu.NewStatus, tu.PreviousProgress, tu.NewProgress,
              tu.TimeSpentHours, tu.Remarks, tu.CreatedAt,
              e.EmployeeName
       FROM dbo.TaskUpdates tu
       JOIN dbo.Employees e ON tu.EmployeeID = e.EmployeeID
       WHERE tu.TaskID = @taskId
       ORDER BY tu.CreatedAt DESC`,
      { taskId }
    );

    // Fetch Comments
    const commentsResult = await executeQuery(
      `SELECT tc.CommentID, tc.CommentText, tc.CreatedAt,
              u.Username, u.UserID,
              e.EmployeeName, e.ProfilePhoto, r.RoleName
       FROM dbo.TaskComments tc
       JOIN dbo.Users u ON tc.UserID = u.UserID
       LEFT JOIN dbo.Employees e ON u.EmployeeID = e.EmployeeID
       LEFT JOIN dbo.Roles r ON u.RoleID = r.RoleID
       WHERE tc.TaskID = @taskId
       ORDER BY tc.CreatedAt ASC`,
      { taskId }
    );

    // Fetch Attachments
    const attachmentsResult = await executeQuery(
      `SELECT att.AttachmentID, att.FileName, att.OriginalName, att.FileType, att.FileSize,
              att.StoragePath, att.CreatedAt,
              u.Username AS UploadedByUsername
       FROM dbo.TaskAttachments att
       JOIN dbo.Users u ON att.UploadedByUserID = u.UserID
       WHERE att.TaskID = @taskId
       ORDER BY att.CreatedAt DESC`,
      { taskId }
    );

    // Fetch Activity Log
    const activityResult = await executeQuery(
      `SELECT act.ActivityID, act.ActionType, act.FieldName, act.OldValue, act.NewValue,
              act.Description, act.CreatedAt,
              u.Username
       FROM dbo.TaskActivityLog act
       JOIN dbo.Users u ON act.UserID = u.UserID
       WHERE act.TaskID = @taskId
       ORDER BY act.CreatedAt DESC`,
      { taskId }
    );

    res.json({
      success: true,
      data: {
        ...task,
        assignees: assigneesResult.recordset,
        checklist: checklistResult.recordset,
        updates: updatesResult.recordset,
        comments: commentsResult.recordset,
        attachments: attachmentsResult.recordset,
        activities: activityResult.recordset,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const {
      companyId,
      title,
      taskTitle,
      description,
      taskDescription,
      taskType = 'General',
      reminderDate,
      remarks,
      status = 'New',
      departmentId,
      locationId,
      categoryId,
      managerId,
      startDate,
      dueDate,
      priority = 'Medium',
      estimatedHours = 0,
      assigneeIds = [],
      checklistItems = [],
      tags,
      relatedImportantDateId,
      relatedVendor,
      relatedCustomer,
    } = req.body;

    const targetCompanyId = companyId ? parseInt(companyId, 10) : null;
    if (!targetCompanyId || isNaN(targetCompanyId)) {
      res.status(400).json({ success: false, message: 'Company selection is mandatory. Please select a company.' });
      return;
    }

    // Backend Security Verification
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(targetCompanyId)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to create tasks for Company #${targetCompanyId}.`,
      });
      return;
    }

    const effectiveTitle = (title || taskTitle || '').trim();
    if (!effectiveTitle || !dueDate) {
      res.status(400).json({ success: false, message: 'Task title and due date are required.' });
      return;
    }
    const effectiveDescription = description || taskDescription || null;

    // Generate Sequential Task Number: TSK-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countResult = await executeQuery<{ TaskCount: number }>(
      `SELECT COUNT(*) AS TaskCount FROM dbo.Tasks WHERE TaskNumber LIKE @pattern`,
      { pattern: `TSK-${currentYear}-%` }
    );
    const nextNum = (countResult.recordset[0]?.TaskCount || 0) + 1;
    const taskNumber = `TSK-${currentYear}-${String(nextNum).padStart(4, '0')}`;

    const insertResult = await executeQuery<{ TaskID: number }>(
      `INSERT INTO dbo.Tasks (
        TaskNumber, CompanyID, LocationID, DepartmentID, CategoryID, TaskTitle, TaskDescription,
        TaskType, ReminderDate, Remarks,
        AssignedByID, ManagerID, StartDate, DueDate, Priority, Status, PercentageComplete,
        EstimatedHours, ActualHours, RelatedImportantDateID, RelatedVendor, RelatedCustomer, Tags,
        CreatedBy, CreatedAt, UpdatedBy, UpdatedAt
      ) 
      OUTPUT INSERTED.TaskID
      VALUES (
        @taskNumber, @targetCompanyId, @locationId, @departmentId, @categoryId, @title, @description,
        @taskType, @reminderDate, @remarks,
        @userId, @managerId, @startDate, @dueDate, @priority, @status, 0,
        @estimatedHours, 0.0, @relatedImportantDateId, @relatedVendor, @relatedCustomer, @tags,
        @userId, SYSUTCDATETIME(), @userId, SYSUTCDATETIME()
      )`,
      {
        taskNumber,
        targetCompanyId,
        locationId: locationId || null,
        departmentId: departmentId || null,
        categoryId: categoryId || null,
        title: effectiveTitle,
        description: effectiveDescription,
        taskType: taskType || 'General',
        reminderDate: reminderDate || null,
        remarks: remarks || null,
        userId,
        managerId: managerId || null,
        startDate: startDate || null,
        dueDate,
        priority: priority || 'Medium',
        status: status || 'New',
        estimatedHours: parseFloat(estimatedHours) || 0,
        relatedImportantDateId: relatedImportantDateId || null,
        relatedVendor: relatedVendor || null,
        relatedCustomer: relatedCustomer || null,
        tags: tags || null,
      }
    );

    const newTaskId = insertResult.recordset[0].TaskID;

    // Add Assignees
    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      for (const empId of assigneeIds) {
        await executeQuery(
          `INSERT INTO dbo.TaskAssignees (TaskID, EmployeeID) VALUES (@newTaskId, @empId)`,
          { newTaskId, empId: parseInt(empId, 10) }
        );

        // Notify Assignee
        const empUser = await executeQuery<{ UserID: number }>(
          `SELECT UserID FROM dbo.Users WHERE EmployeeID = @empId AND Status = 'Active'`,
          { empId }
        );
        if (empUser.recordset.length > 0) {
          await sendNotification({
            userId: empUser.recordset[0].UserID,
            title: `New Task Assigned: ${taskNumber}`,
            message: `You have been assigned task "${title}". Due date: ${dueDate}.`,
            type: 'TaskAssigned',
            referenceType: 'Task',
            referenceId: newTaskId,
          });
        }
      }
    }

    // Add Checklist Items
    if (Array.isArray(checklistItems) && checklistItems.length > 0) {
      let sortOrder = 1;
      for (const itemTitle of checklistItems) {
        if (typeof itemTitle === 'string' && itemTitle.trim()) {
          await executeQuery(
            `INSERT INTO dbo.TaskChecklist (TaskID, Title, IsCompleted, SortOrder)
             VALUES (@newTaskId, @itemTitle, 0, @sortOrder)`,
            { newTaskId, itemTitle: itemTitle.trim(), sortOrder }
          );
          sortOrder++;
        }
      }
    }

    // Record Activity
    await executeQuery(
      `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
       VALUES (@newTaskId, @userId, N'Created', N'Task created and initial assignees notified.')`,
      { newTaskId, userId }
    );

    await logAudit({
      userId,
      action: 'CREATE_TASK',
      entityName: 'Tasks',
      entityId: newTaskId,
      newValues: { taskNumber, title, priority, dueDate, assigneeIds },
      req,
    });

    res.status(201).json({
      success: true,
      message: `Task ${taskNumber} created successfully.`,
      taskId: newTaskId,
      taskNumber,
      data: { taskId: newTaskId, TaskID: newTaskId, taskNumber, TaskNumber: taskNumber },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const {
      companyId,
      title,
      description,
      taskType,
      reminderDate,
      remarks,
      departmentId,
      locationId,
      categoryId,
      managerId,
      startDate,
      dueDate,
      priority,
      status,
      percentageComplete,
      estimatedHours,
      actualHours,
      assigneeIds,
      tags,
      relatedVendor,
      relatedCustomer,
    } = req.body;

    const existingTask = await executeQuery(
      `SELECT * FROM dbo.Tasks WHERE TaskID = @taskId AND IsDeleted = 0`,
      { taskId }
    );

    if (existingTask.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const old = existingTask.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];

    if (!isSuperAdmin && !allowedCompanyIds.includes(old.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to update this company\'s task.' });
      return;
    }

    let targetCompanyId = old.CompanyID;
    if (companyId) {
      const parsedCompId = parseInt(companyId, 10);
      if (!isSuperAdmin && !allowedCompanyIds.includes(parsedCompId)) {
        res.status(403).json({
          success: false,
          message: `Forbidden: You do not have permission to assign this task to Company #${parsedCompId}.`,
        });
        return;
      }
      targetCompanyId = parsedCompId;
    }

    await executeQuery(
      `UPDATE dbo.Tasks SET
        CompanyID = @targetCompanyId,
        TaskTitle = ISNULL(@title, TaskTitle),
        TaskDescription = ISNULL(@description, TaskDescription),
        TaskType = ISNULL(@taskType, TaskType),
        ReminderDate = @reminderDate,
        Remarks = ISNULL(@remarks, Remarks),
        DepartmentID = @departmentId,
        LocationID = @locationId,
        CategoryID = @categoryId,
        ManagerID = @managerId,
        StartDate = @startDate,
        DueDate = ISNULL(@dueDate, DueDate),
        Priority = ISNULL(@priority, Priority),
        Status = ISNULL(@status, Status),
        PercentageComplete = ISNULL(@percentageComplete, PercentageComplete),
        EstimatedHours = ISNULL(@estimatedHours, EstimatedHours),
        ActualHours = ISNULL(@actualHours, ActualHours),
        Tags = @tags,
        RelatedVendor = @relatedVendor,
        RelatedCustomer = @relatedCustomer,
        UpdatedBy = @userId,
        UpdatedAt = SYSUTCDATETIME()
       WHERE TaskID = @taskId`,
      {
        taskId,
        targetCompanyId,
        title: title || null,
        description: description !== undefined ? description : null,
        taskType: taskType || null,
        reminderDate: reminderDate !== undefined ? (reminderDate || null) : old.ReminderDate,
        remarks: remarks !== undefined ? remarks : null,
        departmentId: departmentId || null,
        locationId: locationId || null,
        categoryId: categoryId || null,
        managerId: managerId || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        priority: priority || null,
        status: status || null,
        percentageComplete: percentageComplete !== undefined ? parseInt(percentageComplete, 10) : null,
        estimatedHours: estimatedHours !== undefined ? parseFloat(estimatedHours) : null,
        actualHours: actualHours !== undefined ? parseFloat(actualHours) : null,
        tags: tags || null,
        relatedVendor: relatedVendor || null,
        relatedCustomer: relatedCustomer || null,
        userId,
      }
    );

    // Update Assignees if provided
    if (Array.isArray(assigneeIds)) {
      await executeQuery(`DELETE FROM dbo.TaskAssignees WHERE TaskID = @taskId`, { taskId });
      for (const empId of assigneeIds) {
        await executeQuery(
          `INSERT INTO dbo.TaskAssignees (TaskID, EmployeeID) VALUES (@taskId, @empId)`,
          { taskId, empId: parseInt(empId, 10) }
        );
      }
    }

    // Log Activity Changes
    if (status && status !== old.Status) {
      await executeQuery(
        `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, FieldName, OldValue, NewValue, Description)
         VALUES (@taskId, @userId, N'StatusChange', N'Status', @oldVal, @newVal, @desc)`,
        {
          taskId,
          userId,
          oldVal: old.Status,
          newVal: status,
          desc: `Status changed from ${old.Status} to ${status}.`,
        }
      );
    }

    if (dueDate && dueDate !== old.DueDate) {
      await executeQuery(
        `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, FieldName, OldValue, NewValue, Description)
         VALUES (@taskId, @userId, N'DueDateChanged', N'DueDate', @oldVal, @newVal, @desc)`,
        {
          taskId,
          userId,
          oldVal: String(old.DueDate),
          newVal: String(dueDate),
          desc: `Due date changed to ${dueDate}.`,
        }
      );
    }

    await logAudit({
      userId,
      action: 'UPDATE_TASK',
      entityName: 'Tasks',
      entityId: taskId,
      oldValues: old,
      newValues: req.body,
      req,
    });

    res.json({ success: true, message: 'Task updated successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function updateProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const employeeId = req.user!.employeeId;
    const { status, percentageComplete, remarks, timeSpentHours = 0, checklistUpdates } = req.body;

    if (!remarks) {
      res.status(400).json({ success: false, message: 'Remarks are required when updating progress.' });
      return;
    }

    const taskResult = await executeQuery(
      `SELECT TaskID, CompanyID, Status, PercentageComplete, ActualHours, TaskNumber, TaskTitle, ManagerID 
       FROM dbo.Tasks WHERE TaskID = @taskId AND IsDeleted = 0`,
      { taskId }
    );

    if (taskResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const task = taskResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(task.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to update progress for this company\'s task.' });
      return;
    }
    const prevStatus = task.Status;
    const prevProgress = task.PercentageComplete;
    const newStatus = status || prevStatus;
    const newProgress = percentageComplete !== undefined ? parseInt(percentageComplete, 10) : prevProgress;
    const timeSpent = parseFloat(timeSpentHours) || 0.0;
    const newActualHours = (task.ActualHours || 0.0) + timeSpent;

    // Record in TaskUpdates table
    await executeQuery(
      `INSERT INTO dbo.TaskUpdates (
        TaskID, EmployeeID, PreviousStatus, NewStatus, PreviousProgress, NewProgress, TimeSpentHours, Remarks, CreatedAt
      ) VALUES (
        @taskId, @employeeId, @prevStatus, @newStatus, @prevProgress, @newProgress, @timeSpent, @remarks, SYSUTCDATETIME()
      )`,
      {
        taskId,
        employeeId: employeeId || null,
        prevStatus,
        newStatus,
        prevProgress,
        newProgress,
        timeSpent,
        remarks,
      }
    );

    // Update main task
    await executeQuery(
      `UPDATE dbo.Tasks SET
        Status = @newStatus,
        PercentageComplete = @newProgress,
        ActualHours = @newActualHours,
        UpdatedAt = SYSUTCDATETIME()
       WHERE TaskID = @taskId`,
      { newStatus, newProgress, newActualHours, taskId }
    );

    // Process Checklist updates if provided: Array of { checklistItemId, isCompleted }
    if (Array.isArray(checklistUpdates) && checklistUpdates.length > 0) {
      for (const item of checklistUpdates) {
        await executeQuery(
          `UPDATE dbo.TaskChecklist 
           SET IsCompleted = @isCompleted,
               CompletedAt = CASE WHEN @isCompleted = 1 THEN SYSUTCDATETIME() ELSE NULL END,
               CompletedByEmployeeID = CASE WHEN @isCompleted = 1 THEN @employeeId ELSE NULL END
           WHERE ChecklistItemID = @checklistItemId AND TaskID = @taskId`,
          {
            isCompleted: item.isCompleted ? 1 : 0,
            employeeId: employeeId || null,
            checklistItemId: item.checklistItemId,
            taskId,
          }
        );
      }
    }

    // Record Activity
    await executeQuery(
      `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
       VALUES (@taskId, @userId, N'ProgressUpdate', @desc)`,
      {
        taskId,
        userId,
        desc: `Progress updated to ${newProgress}% (${newStatus}). Remarks: ${remarks}`,
      }
    );

    // If submitted for approval, notify Manager
    if (newStatus === 'Waiting for Approval' && task.ManagerID) {
      const mgrUser = await executeQuery<{ UserID: number }>(
        `SELECT UserID FROM dbo.Users WHERE EmployeeID = @managerId AND Status = 'Active'`,
        { managerId: task.ManagerID }
      );
      if (mgrUser.recordset.length > 0) {
        await sendNotification({
          userId: mgrUser.recordset[0].UserID,
          title: `Task Pending Approval: ${task.TaskNumber}`,
          message: `Task "${task.TaskTitle}" has been completed by the team and is awaiting your review.`,
          type: 'TaskApproval',
          referenceType: 'Task',
          referenceId: taskId,
        });
      }
    }

    res.json({ success: true, message: 'Progress update recorded successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const { commentText, mentionedUserIds } = req.body;

    if (!commentText || !commentText.trim()) {
      res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
      return;
    }

    const taskCheck = await executeQuery<any>(
      `SELECT TaskID, CompanyID FROM dbo.Tasks WHERE TaskID = @taskId AND IsDeleted = 0`,
      { taskId }
    );
    if (taskCheck.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(taskCheck.recordset[0].CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have access to comment on this company\'s task.' });
      return;
    }

    const insertResult = await executeQuery<{ CommentID: number }>(
      `INSERT INTO dbo.TaskComments (TaskID, UserID, CommentText, MentionedUserIDs, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.CommentID
       VALUES (@taskId, @userId, @commentText, @mentionedUserIds, SYSUTCDATETIME(), SYSUTCDATETIME())`,
      {
        taskId,
        userId,
        commentText: commentText.trim(),
        mentionedUserIds: mentionedUserIds ? JSON.stringify(mentionedUserIds) : null,
      }
    );

    // Activity log
    await executeQuery(
      `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
       VALUES (@taskId, @userId, N'CommentAdded', N'Added a conversation comment.')`,
      { taskId, userId }
    );

    // Send notifications to mentioned users
    if (Array.isArray(mentionedUserIds) && mentionedUserIds.length > 0) {
      for (const mUserId of mentionedUserIds) {
        await sendNotification({
          userId: parseInt(mUserId, 10),
          title: `Mentioned in Task #${taskId}`,
          message: `${req.user!.username} mentioned you: "${commentText.substring(0, 100)}..."`,
          type: 'Mention',
          referenceType: 'Task',
          referenceId: taskId,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      commentId: insertResult.recordset[0].CommentID,
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadTaskAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    const taskCheck = await executeQuery<any>(
      `SELECT TaskID, CompanyID FROM dbo.Tasks WHERE TaskID = @taskId AND IsDeleted = 0`,
      { taskId }
    );
    if (taskCheck.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(taskCheck.recordset[0].CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have access to upload attachments for this company\'s task.' });
      return;
    }

    const insertResult = await executeQuery<{ AttachmentID: number }>(
      `INSERT INTO dbo.TaskAttachments (
        TaskID, FileName, OriginalName, FileType, FileSize, StoragePath, UploadedByUserID, CreatedAt
      )
      OUTPUT INSERTED.AttachmentID
      VALUES (
        @taskId, @fileName, @origName, @fileType, @fileSize, @storagePath, @userId, SYSUTCDATETIME()
      )`,
      {
        taskId,
        fileName: req.file.filename,
        origName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storagePath: `/uploads/${req.file.filename}`,
        userId,
      }
    );

    await executeQuery(
      `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
       VALUES (@taskId, @userId, N'AttachmentUploaded', @desc)`,
      {
        taskId,
        userId,
        desc: `Uploaded file: ${req.file.originalname}`,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully.',
      attachmentId: insertResult.recordset[0].AttachmentID,
      filePath: `/uploads/${req.file.filename}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function approveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const taskResult = await executeQuery(
      `SELECT TaskID, CompanyID, TaskNumber, TaskTitle, Status FROM dbo.Tasks WHERE TaskID = @taskId AND IsDeleted = 0`,
      { taskId }
    );

    if (taskResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const task = taskResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(task.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to review this company\'s task.' });
      return;
    }

    await executeQuery(
      `UPDATE dbo.Tasks SET
        Status = N'Completed',
        PercentageComplete = 100,
        CompletedDate = SYSUTCDATETIME(),
        ApprovedByID = @userId,
        ApprovedDate = SYSUTCDATETIME(),
        RejectionReason = NULL,
        UpdatedAt = SYSUTCDATETIME()
       WHERE TaskID = @taskId`,
      { taskId, userId }
    );

    await executeQuery(
      `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
       VALUES (@taskId, @userId, N'Approved', N'Task review completed and approved. Status marked as Completed.')`,
      { taskId, userId }
    );

    // Notify assignees
    const assignees = await executeQuery<{ UserID: number }>(
      `SELECT u.UserID 
       FROM dbo.TaskAssignees ta
       JOIN dbo.Users u ON ta.EmployeeID = u.EmployeeID
       WHERE ta.TaskID = @taskId AND u.Status = 'Active'`,
      { taskId }
    );

    for (const a of assignees.recordset) {
      await sendNotification({
        userId: a.UserID,
        title: `Task Approved: ${task.TaskNumber}`,
        message: `Task "${task.TaskTitle}" has been reviewed and approved by management.`,
        type: 'TaskAssigned',
        referenceType: 'Task',
        referenceId: taskId,
      });
    }

    await logAudit({
      userId,
      action: 'APPROVE_TASK',
      entityName: 'Tasks',
      entityId: taskId,
      req,
    });

    res.json({ success: true, message: 'Task approved and marked as completed.' });
  } catch (err) {
    next(err);
  }
}

export async function rejectTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      return;
    }

    const taskResult = await executeQuery(
      `SELECT TaskID, CompanyID, TaskNumber, TaskTitle, Status FROM dbo.Tasks WHERE TaskID = @taskId AND IsDeleted = 0`,
      { taskId }
    );

    if (taskResult.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const task = taskResult.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(task.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to review this company\'s task.' });
      return;
    }

    await executeQuery(
      `UPDATE dbo.Tasks SET
        Status = N'In Progress',
        PercentageComplete = 75,
        RejectionReason = @reason,
        UpdatedAt = SYSUTCDATETIME()
       WHERE TaskID = @taskId`,
      { taskId, reason: reason.trim() }
    );

    await executeQuery(
      `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
       VALUES (@taskId, @userId, N'Rejected', @desc)`,
      {
        taskId,
        userId,
        desc: `Task rejected by reviewer. Reason: ${reason.trim()}`,
      }
    );

    // Notify assignees
    const assignees = await executeQuery<{ UserID: number }>(
      `SELECT u.UserID 
       FROM dbo.TaskAssignees ta
       JOIN dbo.Users u ON ta.EmployeeID = u.EmployeeID
       WHERE ta.TaskID = @taskId AND u.Status = 'Active'`,
      { taskId }
    );

    for (const a of assignees.recordset) {
      await sendNotification({
        userId: a.UserID,
        title: `Task Review Needs Changes: ${task.TaskNumber}`,
        message: `Task "${task.TaskTitle}" was returned for changes: "${reason.trim()}"`,
        type: 'TaskRejected',
        referenceType: 'Task',
        referenceId: taskId,
      });
    }

    await logAudit({
      userId,
      action: 'REJECT_TASK',
      entityName: 'Tasks',
      entityId: taskId,
      newValues: { reason },
      req,
    });

    res.json({ success: true, message: 'Task status returned to In Progress with rejection feedback.' });
  } catch (err) {
    next(err);
  }
}

export async function bulkTaskAction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { taskIds, action, value } = req.body;
    const userId = req.user!.userId;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      res.status(400).json({ success: false, message: 'Please select at least one task.' });
      return;
    }

    const validIds = taskIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));

    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    const compFilter = isSuperAdmin ? '' : ` AND CompanyID IN (${allowedCompanyIds.join(', ')})`;

    if (action === 'status') {
      for (const id of validIds) {
        await executeQuery(
          `UPDATE dbo.Tasks SET Status = @value, UpdatedAt = SYSUTCDATETIME() 
           WHERE TaskID = @id ${compFilter}`,
          { value, id }
        );
        await executeQuery(
          `INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
           VALUES (@id, @userId, N'BulkStatusChange', @desc)`,
          { id, userId, desc: `Bulk status update to ${value}` }
        );
      }
    } else if (action === 'priority') {
      for (const id of validIds) {
        await executeQuery(
          `UPDATE dbo.Tasks SET Priority = @value, UpdatedAt = SYSUTCDATETIME() 
           WHERE TaskID = @id ${compFilter}`,
          { value, id }
        );
      }
    } else if (action === 'delete') {
      for (const id of validIds) {
        await executeQuery(
          `UPDATE dbo.Tasks SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME() 
           WHERE TaskID = @id ${compFilter}`,
          { id }
        );
      }
    } else if (action === 'assign') {
      const empId = parseInt(value, 10);
      for (const id of validIds) {
        await executeQuery(
          `IF NOT EXISTS (SELECT 1 FROM dbo.TaskAssignees WHERE TaskID = @id AND EmployeeID = @empId)
           INSERT INTO dbo.TaskAssignees (TaskID, EmployeeID) VALUES (@id, @empId)`,
          { id, empId }
        );
      }
    }

    await logAudit({
      userId,
      action: 'BULK_TASK_ACTION',
      entityName: 'Tasks',
      newValues: { action, value, count: validIds.length },
      req,
    });

    res.json({ success: true, message: `Bulk action "${action}" applied to ${validIds.length} tasks.` });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const existingTask = await executeQuery(
      `SELECT TaskID, CompanyID FROM dbo.Tasks WHERE TaskID = @taskId AND IsDeleted = 0`,
      { taskId }
    );

    if (existingTask.recordset.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found.' });
      return;
    }

    const task = existingTask.recordset[0];
    const isSuperAdmin = req.tenant?.isSuperAdmin || req.user?.roleName === 'Super Admin' || req.user?.isPlatformAdmin;
    const allowedCompanyIds = req.tenant?.allowedCompanyIds || [req.user!.companyId];
    if (!isSuperAdmin && !allowedCompanyIds.includes(task.CompanyID)) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to delete this company\'s task.' });
      return;
    }

    await executeQuery(
      `UPDATE dbo.Tasks SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME() 
       WHERE TaskID = @taskId`,
      { taskId }
    );

    await logAudit({
      userId,
      action: 'DELETE_TASK',
      entityName: 'Tasks',
      entityId: taskId,
      req,
    });

    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const templates = await executeQuery(
      `SELECT t.*, d.DepartmentName, c.CategoryName
       FROM dbo.TaskTemplates t
       LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
       LEFT JOIN dbo.TaskCategories c ON t.CategoryID = c.CategoryID
       WHERE t.CompanyID = @companyId
       ORDER BY t.TemplateName ASC`,
      { companyId }
    );

    res.json({ success: true, data: templates.recordset });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const { templateName, description, departmentId, categoryId, estimatedHours, priority, checklist } = req.body;

    if (!templateName) {
      res.status(400).json({ success: false, message: 'Template name is required.' });
      return;
    }

    const insertResult = await executeQuery<{ TemplateID: number }>(
      `INSERT INTO dbo.TaskTemplates (
        CompanyID, DepartmentID, CategoryID, TemplateName, Description, EstimatedHours, Priority, ChecklistJSON, CreatedAt, UpdatedAt
      )
      OUTPUT INSERTED.TemplateID
      VALUES (
        @companyId, @departmentId, @categoryId, @templateName, @description, @estimatedHours, @priority, @checklistJSON, SYSUTCDATETIME(), SYSUTCDATETIME()
      )`,
      {
        companyId,
        departmentId: departmentId || null,
        categoryId: categoryId || null,
        templateName: templateName.trim(),
        description: description || null,
        estimatedHours: parseFloat(estimatedHours) || 0,
        priority: priority || 'Medium',
        checklistJSON: checklist ? JSON.stringify(checklist) : null,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Template created successfully.',
      templateId: insertResult.recordset[0].TemplateID,
    });
  } catch (err) {
    next(err);
  }
}
