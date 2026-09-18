"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDailyMaintenanceJob = runDailyMaintenanceJob;
exports.initScheduler = initScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../config/db");
const notification_service_1 = require("../services/notification.service");
/**
 * Runs the daily automated maintenance, reminder, escalation, and recurrence tasks
 */
async function runDailyMaintenanceJob() {
    const dateStr = new Date().toISOString().substring(0, 10);
    console.log(`[Scheduler] Running Daily Maintenance Job for ${dateStr}...`);
    try {
        // 1. OVERDUE TASK DETECTION
        const overdueResult = await (0, db_1.executeQuery)(`SELECT t.TaskID, t.TaskNumber, t.TaskTitle, t.DueDate, t.ManagerID, t.CompanyID
       FROM dbo.Tasks t
       WHERE t.DueDate < CAST(GETDATE() AS DATE) 
         AND t.Status NOT IN ('Completed', 'Cancelled', 'Overdue')
         AND t.IsDeleted = 0`);
        for (const task of overdueResult.recordset) {
            // Mark status as Overdue
            await (0, db_1.executeQuery)(`UPDATE dbo.Tasks SET Status = N'Overdue', UpdatedAt = SYSUTCDATETIME() WHERE TaskID = @id`, { id: task.TaskID });
            // Record Activity
            await (0, db_1.executeQuery)(`INSERT INTO dbo.TaskActivityLog (TaskID, UserID, ActionType, Description)
         VALUES (@id, 1, N'OverdueAutoFlag', N'Task automatically marked as Overdue by system scheduler.')`, { id: task.TaskID });
        }
        // 2. OVERDUE TASK ESCALATIONS
        const escalatedTasks = await (0, db_1.executeQuery)(`SELECT 
        t.TaskID, t.TaskNumber, t.TaskTitle, t.DueDate,
        DATEDIFF(day, t.DueDate, CAST(GETDATE() AS DATE)) AS DaysOverdue,
        t.ManagerID, t.CompanyID
       FROM dbo.Tasks t
       WHERE (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled')))
         AND t.IsDeleted = 0`);
        for (const t of escalatedTasks.recordset) {
            // Fetch assignees
            const assignees = await (0, db_1.executeQuery)(`SELECT u.UserID FROM dbo.TaskAssignees ta JOIN dbo.Users u ON ta.EmployeeID = u.EmployeeID WHERE ta.TaskID = @id AND u.Status = 'Active'`, { id: t.TaskID });
            // Day 1: Remind Employee
            if (t.DaysOverdue >= 1) {
                for (const a of assignees.recordset) {
                    await (0, notification_service_1.sendNotification)({
                        userId: a.UserID,
                        title: `Task Overdue Alert: ${t.TaskNumber}`,
                        message: `Task "${t.TaskTitle}" was due on ${t.DueDate.toISOString().substring(0, 10)} and is now overdue. Please submit progress immediately.`,
                        type: 'TaskOverdue',
                        referenceType: 'Task',
                        referenceId: t.TaskID,
                        idempotencyKey: `OVERDUE_${t.TaskID}_DAY_1_${dateStr}_U_${a.UserID}`,
                    });
                }
            }
            // Day 2+: Escalate to Department Manager
            if (t.DaysOverdue >= 2 && t.ManagerID) {
                const mgrUser = await (0, db_1.executeQuery)(`SELECT UserID FROM dbo.Users WHERE EmployeeID = @mgrId AND Status = 'Active'`, { mgrId: t.ManagerID });
                if (mgrUser.recordset.length > 0) {
                    await (0, notification_service_1.sendNotification)({
                        userId: mgrUser.recordset[0].UserID,
                        title: `Escalation: Task Overdue ${t.DaysOverdue} Days (${t.TaskNumber})`,
                        message: `Task "${t.TaskTitle}" is overdue by ${t.DaysOverdue} days. Action required.`,
                        type: 'TaskOverdue',
                        referenceType: 'Task',
                        referenceId: t.TaskID,
                        idempotencyKey: `ESCALATE_MGR_${t.TaskID}_DAY_${t.DaysOverdue}_${dateStr}`,
                    });
                }
            }
        }
        // 3. IMPORTANT DATE REMINDERS
        const approachingDates = await (0, db_1.executeQuery)(`SELECT 
        d.ImportantDateID, d.Title, ISNULL(d.ExpiryDate, d.Date) AS ExpiryDate,
        d.ResponsibleEmployeeID,
        DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) AS DaysRemaining
       FROM dbo.ImportantDates d
       WHERE d.Status = 'Active' AND d.IsDeleted = 0
         AND DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) IN (30, 15, 7, 3, 1, 0)`);
        for (const d of approachingDates.recordset) {
            if (d.ResponsibleEmployeeID) {
                const respUser = await (0, db_1.executeQuery)(`SELECT UserID FROM dbo.Users WHERE EmployeeID = @empId AND Status = 'Active'`, { empId: d.ResponsibleEmployeeID });
                if (respUser.recordset.length > 0) {
                    const daysMsg = d.DaysRemaining === 0 ? 'expires TODAY' : `expires in ${d.DaysRemaining} days`;
                    await (0, notification_service_1.sendNotification)({
                        userId: respUser.recordset[0].UserID,
                        title: `Important Date Reminder: ${d.Title}`,
                        message: `"${d.Title}" ${daysMsg} (${(d.ExpiryDate instanceof Date ? d.ExpiryDate.toISOString() : String(d.ExpiryDate)).substring(0, 10)}). Please initiate required renewals.`,
                        type: 'DateApproaching',
                        referenceType: 'ImportantDate',
                        referenceId: d.ImportantDateID,
                        idempotencyKey: `DATE_REMIND_${d.ImportantDateID}_D_${d.DaysRemaining}_${dateStr}`,
                    });
                }
            }
        }
        // 4. IMPORTANT DATE -> AUTO TASK GENERATION
        const autoTasks = await (0, db_1.executeQuery)(`SELECT 
        d.ImportantDateID, d.Title, ISNULL(d.ExpiryDate, d.Date) AS ExpiryDate,
        d.CompanyID, d.DepartmentID, d.LocationID, d.LeadDaysForTask, d.TaskAssignedToID
       FROM dbo.ImportantDates d
       WHERE d.AutoGenerateTask = 1 
         AND d.GeneratedTaskID IS NULL
         AND d.Status = 'Active' 
         AND d.IsDeleted = 0
         AND DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) <= d.LeadDaysForTask`);
        for (const at of autoTasks.recordset) {
            const currentYear = new Date().getFullYear();
            const countRes = await (0, db_1.executeQuery)(`SELECT COUNT(*) AS Cnt FROM dbo.Tasks WHERE TaskNumber LIKE @pattern`, { pattern: `TSK-${currentYear}-%` });
            const nextNum = (countRes.recordset[0]?.Cnt || 0) + 1;
            const taskNumber = `TSK-${currentYear}-${String(nextNum).padStart(4, '0')}`;
            // Create Task
            const insertTask = await (0, db_1.executeQuery)(`INSERT INTO dbo.Tasks (
          TaskNumber, CompanyID, LocationID, DepartmentID, TaskTitle, TaskDescription,
          AssignedByID, StartDate, DueDate, Priority, Status, RelatedImportantDateID, CreatedAt, UpdatedAt
        )
        OUTPUT INSERTED.TaskID
        VALUES (
          @taskNumber, @comp, @loc, @dept, @title, @desc,
          1, CAST(GETDATE() AS DATE), @dueDate, N'High', N'New', @dateId, SYSUTCDATETIME(), SYSUTCDATETIME()
        )`, {
                taskNumber,
                comp: at.CompanyID,
                loc: at.LocationID || null,
                dept: at.DepartmentID || null,
                title: `Action Required: Renew ${at.Title}`,
                desc: `Automated task generated for upcoming date: "${at.Title}". Due date: ${(at.ExpiryDate instanceof Date ? at.ExpiryDate.toISOString() : String(at.ExpiryDate)).substring(0, 10)}.`,
                dueDate: at.ExpiryDate,
                dateId: at.ImportantDateID,
            });
            const genTaskId = insertTask.recordset[0].TaskID;
            // Assign to employee if set
            if (at.TaskAssignedToID) {
                await (0, db_1.executeQuery)(`INSERT INTO dbo.TaskAssignees (TaskID, EmployeeID) VALUES (@genTaskId, @empId)`, { genTaskId, empId: at.TaskAssignedToID });
            }
            // Link generated task back to Important Date
            await (0, db_1.executeQuery)(`UPDATE dbo.ImportantDates SET GeneratedTaskID = @genTaskId WHERE ImportantDateID = @dateId`, { genTaskId, dateId: at.ImportantDateID });
            console.log(`[Scheduler] Auto-generated Task ${taskNumber} for Important Date #${at.ImportantDateID}`);
        }
        console.log(`[Scheduler] Daily Maintenance Job completed successfully.`);
    }
    catch (err) {
        console.error('[Scheduler Error]:', err.message);
    }
}
/**
 * Initialize cron jobs (Daily at 00:05 AM and every hour check)
 */
function initScheduler() {
    // Run once on startup
    setTimeout(() => {
        runDailyMaintenanceJob();
    }, 5000);
    // Run daily at 00:05 AM
    node_cron_1.default.schedule('5 0 * * *', () => {
        runDailyMaintenanceJob();
    });
    // Run every 2 hours to catch real-time state transitions
    node_cron_1.default.schedule('0 */2 * * *', () => {
        runDailyMaintenanceJob();
    });
    console.log('[Scheduler] Background Scheduler initialized (Daily + Bi-hourly).');
}
