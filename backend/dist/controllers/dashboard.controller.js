"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = getDashboardData;
const db_1 = require("../config/db");
async function getDashboardData(req, res, next) {
    try {
        const scopeIds = req.tenant?.scopeCompanyIds || [req.user.companyId];
        const employeeId = req.user.employeeId;
        const isEmployeeRole = req.user.roleName === 'Employee';
        const tScope = scopeIds.length === 1 ? `t.CompanyID = ${scopeIds[0]}` : `t.CompanyID IN (${scopeIds.join(', ')})`;
        const dScope = scopeIds.length === 1 ? `CompanyID = ${scopeIds[0]}` : `CompanyID IN (${scopeIds.join(', ')})`;
        const dAliasScope = scopeIds.length === 1 ? `d.CompanyID = ${scopeIds[0]}` : `d.CompanyID IN (${scopeIds.join(', ')})`;
        const eScope = scopeIds.length === 1 ? `e.CompanyID = ${scopeIds[0]}` : `e.CompanyID IN (${scopeIds.join(', ')})`;
        // 1. KPI Counts
        const kpiResult = await (0, db_1.executeQuery)(`SELECT
        COUNT(CASE WHEN CAST(t.DueDate AS DATE) = CAST(GETDATE() AS DATE) AND t.Status != 'Cancelled' THEN 1 END) AS DueToday,
        COUNT(CASE WHEN t.Status = 'New' THEN 1 END) AS NewCount,
        COUNT(CASE WHEN t.Status = 'Pending' THEN 1 END) AS PendingCount,
        COUNT(CASE WHEN t.Status = 'In Progress' THEN 1 END) AS InProgressCount,
        COUNT(CASE WHEN t.Status = 'On Hold' THEN 1 END) AS OnHoldCount,
        COUNT(CASE WHEN t.Status = 'Waiting for Approval' THEN 1 END) AS WaitingApprovalCount,
        COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) AS CompletedCount,
        COUNT(CASE WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 1 END) AS OverdueCount,
        COUNT(CASE WHEN t.DueDate >= CAST(GETDATE() AS DATE) AND t.DueDate <= DATEADD(day, 7, CAST(GETDATE() AS DATE)) AND t.Status NOT IN ('Completed', 'Cancelled') THEN 1 END) AS DueThisWeek,
        COUNT(*) AS TotalTasks
       FROM dbo.Tasks t
       WHERE ${tScope} AND t.IsDeleted = 0
       ${isEmployeeRole && employeeId ? `AND EXISTS (SELECT 1 FROM dbo.TaskAssignees ta WHERE ta.TaskID = t.TaskID AND ta.EmployeeID = @employeeId)` : ''}`, { employeeId });
        // 2. Important Dates Counts
        const dateKpiResult = await (0, db_1.executeQuery)(`SELECT
        COUNT(*) AS TotalDates,
        COUNT(CASE WHEN ExpiryDate >= CAST(GETDATE() AS DATE) AND ExpiryDate <= DATEADD(day, 15, CAST(GETDATE() AS DATE)) AND Status = 'Active' THEN 1 END) AS ExpiringSoon,
        COUNT(CASE WHEN CAST(ExpiryDate AS DATE) = CAST(GETDATE() AS DATE) AND Status = 'Active' THEN 1 END) AS ExpiringToday,
        COUNT(CASE WHEN ExpiryDate < CAST(GETDATE() AS DATE) AND Status = 'Active' THEN 1 END) AS ExpiredCount
       FROM dbo.ImportantDates
       WHERE ${dScope} AND IsDeleted = 0`);
        // 3. Status Breakdown
        const statusResult = await (0, db_1.executeQuery)(`SELECT 
        CASE 
          WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 'Overdue'
          ELSE t.Status 
        END AS StatusName,
        COUNT(*) AS TaskCount
       FROM dbo.Tasks t
       WHERE ${tScope} AND t.IsDeleted = 0
       ${isEmployeeRole && employeeId ? `AND EXISTS (SELECT 1 FROM dbo.TaskAssignees ta WHERE ta.TaskID = t.TaskID AND ta.EmployeeID = @employeeId)` : ''}
       GROUP BY 
        CASE 
          WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 'Overdue'
          ELSE t.Status 
        END`, { employeeId });
        // 4. Department Breakdown
        const deptResult = await (0, db_1.executeQuery)(`SELECT 
        ISNULL(d.DepartmentName, 'General') AS DepartmentName,
        COUNT(*) AS Total,
        COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) AS Completed,
        COUNT(CASE WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 1 END) AS Overdue,
        COUNT(CASE WHEN t.Status IN ('New', 'Pending', 'In Progress', 'Waiting for Approval') THEN 1 END) AS ActiveTasks
       FROM dbo.Tasks t
       LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
       WHERE ${tScope} AND t.IsDeleted = 0
       GROUP BY ISNULL(d.DepartmentName, 'General')`);
        // 5. Priority Breakdown
        const priorityResult = await (0, db_1.executeQuery)(`SELECT 
        t.Priority,
        COUNT(*) AS TaskCount
       FROM dbo.Tasks t
       WHERE ${tScope} AND t.IsDeleted = 0
       ${isEmployeeRole && employeeId ? `AND EXISTS (SELECT 1 FROM dbo.TaskAssignees ta WHERE ta.TaskID = t.TaskID AND ta.EmployeeID = @employeeId)` : ''}
       GROUP BY t.Priority`, { employeeId });
        // 6. Upcoming Important Dates (Next 10)
        const upcomingDatesResult = await (0, db_1.executeQuery)(`SELECT TOP 10 
        d.ImportantDateID, d.Title, d.Date, d.ExpiryDate, d.Priority, d.Status,
        c.CategoryName, c.ColorCode, c.IconName,
        e.EmployeeName AS ResponsiblePerson,
        dep.DepartmentName,
        comp.CompanyName, comp.CompanyCode,
        DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) AS DaysRemaining
       FROM dbo.ImportantDates d
       JOIN dbo.ImportantDateCategories c ON d.CategoryID = c.CategoryID
       JOIN dbo.Companies comp ON d.CompanyID = comp.CompanyID
       LEFT JOIN dbo.Employees e ON d.ResponsibleEmployeeID = e.EmployeeID
       LEFT JOIN dbo.Departments dep ON d.DepartmentID = dep.DepartmentID
       WHERE ${dAliasScope} AND d.IsDeleted = 0 AND d.Status = 'Active'
         AND ISNULL(d.ExpiryDate, d.Date) >= CAST(GETDATE() AS DATE)
       ORDER BY ISNULL(d.ExpiryDate, d.Date) ASC`);
        // 7. Overdue Tasks Table
        const overdueResult = await (0, db_1.executeQuery)(`SELECT TOP 10 
        t.TaskID, t.TaskNumber, t.TaskTitle, t.DueDate, t.Priority, t.Status, t.PercentageComplete,
        d.DepartmentName,
        comp.CompanyName, comp.CompanyCode,
        DATEDIFF(day, t.DueDate, CAST(GETDATE() AS DATE)) AS DaysOverdue,
        (SELECT STRING_AGG(e.EmployeeName, ', ') 
         FROM dbo.TaskAssignees ta 
         JOIN dbo.Employees e ON ta.EmployeeID = e.EmployeeID 
         WHERE ta.TaskID = t.TaskID) AS Assignees
       FROM dbo.Tasks t
       JOIN dbo.Companies comp ON t.CompanyID = comp.CompanyID
       LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
       WHERE ${tScope} AND t.IsDeleted = 0
         AND (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled')))
       ${isEmployeeRole && employeeId ? `AND EXISTS (SELECT 1 FROM dbo.TaskAssignees ta WHERE ta.TaskID = t.TaskID AND ta.EmployeeID = @employeeId)` : ''}
       ORDER BY t.DueDate ASC`, { employeeId });
        // 8. Employee Task Completion Rates (Top 6 Performers)
        const employeeCompResult = await (0, db_1.executeQuery)(`SELECT TOP 6
        e.EmployeeName,
        COUNT(ta.TaskID) AS TotalAssigned,
        COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) AS Completed,
        COUNT(CASE WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 1 END) AS Overdue,
        CAST(CASE WHEN COUNT(ta.TaskID) > 0 THEN (COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) * 100.0 / COUNT(ta.TaskID)) ELSE 0 END AS DECIMAL(5,1)) AS CompletionRate
       FROM dbo.Employees e
       JOIN dbo.TaskAssignees ta ON e.EmployeeID = ta.EmployeeID
       JOIN dbo.Tasks t ON ta.TaskID = t.TaskID AND t.IsDeleted = 0
       WHERE ${eScope} AND e.Status = 'Active'
       GROUP BY e.EmployeeID, e.EmployeeName
       ORDER BY TotalAssigned DESC`);
        // 9. My Day Tasks (Assigned to logged-in user for today or pending)
        let myDayTasks = [];
        if (employeeId) {
            const myDayResult = await (0, db_1.executeQuery)(`SELECT TOP 10
          t.TaskID, t.TaskNumber, t.TaskTitle, t.DueDate, t.Priority, t.Status, t.PercentageComplete,
          c.CategoryName, c.ColorCode
         FROM dbo.Tasks t
         JOIN dbo.TaskAssignees ta ON t.TaskID = ta.TaskID
         LEFT JOIN dbo.TaskCategories c ON t.CategoryID = c.CategoryID
         WHERE ta.EmployeeID = @employeeId AND t.IsDeleted = 0
           AND (CAST(t.DueDate AS DATE) = CAST(GETDATE() AS DATE) OR t.Status IN ('In Progress', 'Pending', 'Waiting for Approval') OR t.DueDate < CAST(GETDATE() AS DATE))
         ORDER BY t.DueDate ASC`, { employeeId });
            myDayTasks = myDayResult.recordset;
        }
        const kpis = kpiResult.recordset[0] || {};
        const dateKpis = dateKpiResult.recordset[0] || {};
        res.json({
            success: true,
            data: {
                activeCompany: req.tenant?.activeCompany,
                scopeCompanyIds: scopeIds,
                kpis: {
                    todayTasks: kpis.DueToday || 0,
                    pendingTasks: (kpis.PendingCount || 0) + (kpis.NewCount || 0),
                    inProgressTasks: kpis.InProgressCount || 0,
                    overdueTasks: kpis.OverdueCount || 0,
                    dueToday: kpis.DueToday || 0,
                    dueThisWeek: kpis.DueThisWeek || 0,
                    completedTasks: kpis.CompletedCount || 0,
                    waitingApprovalTasks: kpis.WaitingApprovalCount || 0,
                    totalTasks: kpis.TotalTasks || 0,
                    totalImportantDates: dateKpis.TotalDates || 0,
                    expiringSoonDates: dateKpis.ExpiringSoon || 0,
                    expiredDates: dateKpis.ExpiredCount || 0,
                },
                charts: {
                    statusBreakdown: statusResult.recordset,
                    departmentBreakdown: deptResult.recordset,
                    priorityBreakdown: priorityResult.recordset,
                    employeePerformance: employeeCompResult.recordset,
                },
                upcomingDates: upcomingDatesResult.recordset,
                overdueTasks: overdueResult.recordset,
                myDayTasks,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
