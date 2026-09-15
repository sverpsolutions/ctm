import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../config/db';
import { logAudit } from '../services/audit.service';

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;

    const reminderRules = await executeQuery(
      `SELECT * FROM dbo.ReminderRules WHERE CompanyID = @companyId ORDER BY DaysOffset ASC`,
      { companyId }
    );

    const escalationRules = await executeQuery(
      `SELECT * FROM dbo.EscalationRules WHERE CompanyID = @companyId ORDER BY DaysOverdue ASC`,
      { companyId }
    );

    const taskCategories = await executeQuery(
      `SELECT * FROM dbo.TaskCategories WHERE CompanyID = @companyId OR CompanyID IS NULL ORDER BY CategoryName ASC`,
      { companyId }
    );

    res.json({
      success: true,
      data: {
        reminderRules: reminderRules.recordset,
        escalationRules: escalationRules.recordset,
        taskCategories: taskCategories.recordset,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function saveReminderRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { rules } = req.body; // Array of { ruleName, targetType, daysOffset, channel, isActive }

    if (!Array.isArray(rules)) {
      res.status(400).json({ success: false, message: 'Rules array is required.' });
      return;
    }

    await executeQuery(`DELETE FROM dbo.ReminderRules WHERE CompanyID = @companyId`, { companyId });

    for (const r of rules) {
      await executeQuery(
        `INSERT INTO dbo.ReminderRules (CompanyID, RuleName, TargetType, DaysOffset, Channel, IsActive)
         VALUES (@companyId, @ruleName, @targetType, @daysOffset, @channel, @isActive)`,
        {
          companyId,
          ruleName: r.ruleName,
          targetType: r.targetType || 'Both',
          daysOffset: parseInt(r.daysOffset, 10),
          channel: r.channel || 'In-App',
          isActive: r.isActive ? 1 : 0,
        }
      );
    }

    await logAudit({
      userId,
      action: 'UPDATE_REMINDER_RULES',
      entityName: 'ReminderRules',
      newValues: { count: rules.length },
      req,
    });

    res.json({ success: true, message: 'Reminder rules saved successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function saveEscalationRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { rules } = req.body; // Array of { daysOverdue, escalateToRole, channel, isActive }

    if (!Array.isArray(rules)) {
      res.status(400).json({ success: false, message: 'Rules array is required.' });
      return;
    }

    await executeQuery(`DELETE FROM dbo.EscalationRules WHERE CompanyID = @companyId`, { companyId });

    for (const r of rules) {
      await executeQuery(
        `INSERT INTO dbo.EscalationRules (CompanyID, DaysOverdue, EscalateToRole, Channel, IsActive)
         VALUES (@companyId, @daysOverdue, @escalateToRole, @channel, @isActive)`,
        {
          companyId,
          daysOverdue: parseInt(r.daysOverdue, 10),
          escalateToRole: r.escalateToRole,
          channel: r.channel || 'In-App',
          isActive: r.isActive ? 1 : 0,
        }
      );
    }

    await logAudit({
      userId,
      action: 'UPDATE_ESCALATION_RULES',
      entityName: 'EscalationRules',
      newValues: { count: rules.length },
      req,
    });

    res.json({ success: true, message: 'Escalation rules saved successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function createTaskCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;
    const { categoryName, colorCode = '#10b981', requiresApproval = false } = req.body;

    if (!categoryName) {
      res.status(400).json({ success: false, message: 'Category name is required.' });
      return;
    }

    const result = await executeQuery<{ CategoryID: number }>(
      `INSERT INTO dbo.TaskCategories (CompanyID, CategoryName, ColorCode, RequiresApproval, Status, CreatedAt)
       OUTPUT INSERTED.CategoryID
       VALUES (@companyId, @categoryName, @colorCode, @requiresApproval, N'Active', SYSUTCDATETIME())`,
      {
        companyId,
        categoryName: categoryName.trim(),
        colorCode,
        requiresApproval: requiresApproval ? 1 : 0,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Task category created successfully.',
      categoryId: result.recordset[0].CategoryID,
    });
  } catch (err) {
    next(err);
  }
}
