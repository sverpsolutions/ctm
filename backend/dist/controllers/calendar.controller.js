"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarEvents = getCalendarEvents;
const db_1 = require("../config/db");
async function getCalendarEvents(req, res, next) {
    try {
        const scopeIds = req.tenant?.scopeCompanyIds || [req.user.companyId];
        const { start, end, type, departmentId, employeeId } = req.query;
        const startDate = start ? start.substring(0, 10) : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
        const endDate = end ? end.substring(0, 10) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().substring(0, 10);
        const tScope = scopeIds.length === 1 ? `t.CompanyID = ${scopeIds[0]}` : `t.CompanyID IN (${scopeIds.join(', ')})`;
        const dScope = scopeIds.length === 1 ? `d.CompanyID = ${scopeIds[0]}` : `d.CompanyID IN (${scopeIds.join(', ')})`;
        const eScope = scopeIds.length === 1 ? `CompanyID = ${scopeIds[0]}` : `CompanyID IN (${scopeIds.join(', ')})`;
        const events = [];
        // 1. Fetch Tasks
        if (!type || type === 'all' || type === 'tasks') {
            let taskWhere = `${tScope} AND t.IsDeleted = 0 AND t.DueDate >= @startDate AND t.DueDate <= @endDate`;
            const params = { startDate, endDate };
            if (departmentId) {
                taskWhere += ` AND t.DepartmentID = @departmentId`;
                params.departmentId = parseInt(departmentId, 10);
            }
            if (employeeId) {
                taskWhere += ` AND EXISTS (SELECT 1 FROM dbo.TaskAssignees ta WHERE ta.TaskID = t.TaskID AND ta.EmployeeID = @employeeId)`;
                params.employeeId = parseInt(employeeId, 10);
            }
            const tasksResult = await (0, db_1.executeQuery)(`SELECT 
          t.TaskID, t.TaskNumber, t.TaskTitle, t.DueDate, t.StartDate, t.Priority, t.Status,
          t.PercentageComplete,
          d.DepartmentName,
          c.CategoryName, c.ColorCode AS CategoryColor
         FROM dbo.Tasks t
         LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
         LEFT JOIN dbo.TaskCategories c ON t.CategoryID = c.CategoryID
         WHERE ${taskWhere}`, params);
            for (const t of tasksResult.recordset) {
                const dueDateStr = t.DueDate instanceof Date ? t.DueDate.toISOString().substring(0, 10) : String(t.DueDate).substring(0, 10);
                const startDateStr = t.StartDate ? (t.StartDate instanceof Date ? t.StartDate.toISOString().substring(0, 10) : String(t.StartDate).substring(0, 10)) : dueDateStr;
                events.push({
                    id: `task-${t.TaskID}`,
                    referenceId: t.TaskID,
                    title: `[${t.TaskNumber}] ${t.TaskTitle}`,
                    start: startDateStr,
                    end: dueDateStr,
                    type: 'task',
                    status: t.Status,
                    priority: t.Priority,
                    progress: t.PercentageComplete,
                    department: t.DepartmentName,
                    category: t.CategoryName,
                    color: t.Priority === 'Critical' ? '#ef4444' : t.Priority === 'High' ? '#f97316' : '#3b82f6',
                });
            }
        }
        // 2. Fetch Important Dates
        if (!type || type === 'all' || type === 'dates') {
            let dateWhere = `${dScope} AND d.IsDeleted = 0 AND d.Status = 'Active' 
                       AND ISNULL(d.ExpiryDate, d.Date) >= @startDate AND ISNULL(d.ExpiryDate, d.Date) <= @endDate`;
            const dateParams = { startDate, endDate };
            if (departmentId) {
                dateWhere += ` AND d.DepartmentID = @departmentId`;
                dateParams.departmentId = parseInt(departmentId, 10);
            }
            const datesResult = await (0, db_1.executeQuery)(`SELECT
          d.ImportantDateID, d.Title, d.Date, d.ExpiryDate, d.Priority, d.Status,
          d.GeneratedTaskID, d.AutoGenerateTask,
          c.CategoryName, c.ColorCode, c.IconName,
          dep.DepartmentName,
          e.EmployeeName AS ResponsiblePerson,
          gt.TaskNumber AS GeneratedTaskNumber,
          gt.Status AS GeneratedTaskStatus,
          gt.TaskTitle AS GeneratedTaskTitle
         FROM dbo.ImportantDates d
         JOIN dbo.ImportantDateCategories c ON d.CategoryID = c.CategoryID
         LEFT JOIN dbo.Departments dep ON d.DepartmentID = dep.DepartmentID
         LEFT JOIN dbo.Employees e ON d.ResponsibleEmployeeID = e.EmployeeID
         LEFT JOIN dbo.Tasks gt ON d.GeneratedTaskID = gt.TaskID
         WHERE ${dateWhere}`, dateParams);
            for (const d of datesResult.recordset) {
                const rawDate = d.ExpiryDate || d.Date;
                const targetDate = rawDate instanceof Date ? rawDate.toISOString().substring(0, 10) : String(rawDate).substring(0, 10);
                const taskStatus = d.GeneratedTaskStatus || null;
                const isDone = taskStatus === 'Completed';
                const titlePrefix = isDone ? '✅' : taskStatus ? '⏳' : '📌';
                events.push({
                    id: `date-${d.ImportantDateID}`,
                    referenceId: d.ImportantDateID,
                    title: `${titlePrefix} ${d.Title}`,
                    start: targetDate,
                    end: targetDate,
                    type: 'date',
                    priority: d.Priority,
                    status: d.Status,
                    department: d.DepartmentName,
                    category: d.CategoryName,
                    responsiblePerson: d.ResponsiblePerson,
                    color: isDone ? '#10b981' : d.ColorCode || '#8b5cf6',
                    generatedTaskId: d.GeneratedTaskID || null,
                    generatedTaskNumber: d.GeneratedTaskNumber || null,
                    generatedTaskStatus: taskStatus,
                    autoGenerateTask: d.AutoGenerateTask,
                });
            }
        }
        // 3. Fetch Employee Birthdays & Work Anniversaries
        if (!type || type === 'all' || type === 'events') {
            const currentYear = new Date().getFullYear();
            const empEvents = await (0, db_1.executeQuery)(`SELECT EmployeeID, EmployeeName, Birthday, WorkAnniversary, DepartmentID 
         FROM dbo.Employees 
         WHERE ${eScope} AND Status = 'Active' AND IsDeleted = 0`);
            for (const emp of empEvents.recordset) {
                if (emp.Birthday) {
                    const bdayDate = new Date(emp.Birthday);
                    if (!isNaN(bdayDate.getTime())) {
                        const bdayMonth = String(bdayDate.getUTCMonth() + 1).padStart(2, '0');
                        const bdayDay = String(bdayDate.getUTCDate()).padStart(2, '0');
                        const thisYearBday = `${currentYear}-${bdayMonth}-${bdayDay}`;
                        if (thisYearBday >= startDate && thisYearBday <= endDate) {
                            events.push({
                                id: `bday-${emp.EmployeeID}-${currentYear}`,
                                referenceId: emp.EmployeeID,
                                title: `🎂 Birthday: ${emp.EmployeeName}`,
                                start: thisYearBday,
                                end: thisYearBday,
                                type: 'birthday',
                                color: '#ec4899',
                            });
                        }
                    }
                }
                if (emp.WorkAnniversary) {
                    const annDate = new Date(emp.WorkAnniversary);
                    if (!isNaN(annDate.getTime())) {
                        const annMonth = String(annDate.getUTCMonth() + 1).padStart(2, '0');
                        const annDay = String(annDate.getUTCDate()).padStart(2, '0');
                        const thisYearAnn = `${currentYear}-${annMonth}-${annDay}`;
                        if (thisYearAnn >= startDate && thisYearAnn <= endDate) {
                            events.push({
                                id: `ann-${emp.EmployeeID}-${currentYear}`,
                                referenceId: emp.EmployeeID,
                                title: `🎖️ Work Anniversary: ${emp.EmployeeName}`,
                                start: thisYearAnn,
                                end: thisYearAnn,
                                type: 'anniversary',
                                color: '#f59e0b',
                            });
                        }
                    }
                }
            }
        }
        res.json({ success: true, data: events });
    }
    catch (err) {
        next(err);
    }
}
