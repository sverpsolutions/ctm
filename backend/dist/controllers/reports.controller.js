"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskReports = getTaskReports;
exports.getDateReports = getDateReports;
exports.getEmployeePerformance = getEmployeePerformance;
exports.getDepartmentPerformance = getDepartmentPerformance;
const db_1 = require("../config/db");
async function getTaskReports(req, res, next) {
    try {
        const scopeIds = req.tenant?.scopeCompanyIds || [req.user.companyId];
        const { status, priority, departmentId, employeeId, startDate, endDate } = req.query;
        const tScope = scopeIds.length === 1 ? `t.CompanyID = ${scopeIds[0]}` : `t.CompanyID IN (${scopeIds.join(', ')})`;
        let whereSql = `${tScope} AND t.IsDeleted = 0`;
        const params = {};
        if (status) {
            if (status === 'Overdue') {
                whereSql += ` AND (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled')))`;
            }
            else {
                whereSql += ` AND t.Status = @status`;
                params.status = status;
            }
        }
        if (priority) {
            whereSql += ` AND t.Priority = @priority`;
            params.priority = priority;
        }
        if (departmentId) {
            whereSql += ` AND t.DepartmentID = @departmentId`;
            params.departmentId = parseInt(departmentId, 10);
        }
        if (employeeId) {
            whereSql += ` AND EXISTS (SELECT 1 FROM dbo.TaskAssignees ta WHERE ta.TaskID = t.TaskID AND ta.EmployeeID = @employeeId)`;
            params.employeeId = parseInt(employeeId, 10);
        }
        if (startDate) {
            whereSql += ` AND t.DueDate >= @startDate`;
            params.startDate = startDate;
        }
        if (endDate) {
            whereSql += ` AND t.DueDate <= @endDate`;
            params.endDate = endDate;
        }
        // Detailed Report Records
        const records = await (0, db_1.executeQuery)(`SELECT 
        t.TaskID, t.TaskNumber, t.TaskTitle, t.DueDate, t.StartDate, t.Priority, t.Status,
        CASE 
          WHEN (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled')) THEN 'Overdue'
          ELSE t.Status 
        END AS EffectiveStatus,
        t.PercentageComplete, t.EstimatedHours, t.ActualHours, t.CompletedDate,
        d.DepartmentName,
        c.CategoryName,
        comp.CompanyName, comp.CompanyCode,
        (SELECT STRING_AGG(e.EmployeeName, ', ') 
         FROM dbo.TaskAssignees ta 
         JOIN dbo.Employees e ON ta.EmployeeID = e.EmployeeID 
         WHERE ta.TaskID = t.TaskID) AS Assignees,
        DATEDIFF(day, t.StartDate, t.CompletedDate) AS DaysTaken
       FROM dbo.Tasks t
       JOIN dbo.Companies comp ON t.CompanyID = comp.CompanyID
       LEFT JOIN dbo.Departments d ON t.DepartmentID = d.DepartmentID
       LEFT JOIN dbo.TaskCategories c ON t.CategoryID = c.CategoryID
       WHERE ${whereSql}
       ORDER BY t.DueDate ASC`, params);
        // Summary Aggregates
        const summary = await (0, db_1.executeQuery)(`SELECT 
        COUNT(*) AS TotalCount,
        COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) AS CompletedCount,
        COUNT(CASE WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 1 END) AS OverdueCount,
        COUNT(CASE WHEN t.Status IN ('New', 'Pending', 'In Progress', 'Waiting for Approval') THEN 1 END) AS PendingCount,
        COUNT(CASE WHEN t.Priority = 'Critical' THEN 1 END) AS CriticalCount,
        AVG(CASE WHEN t.Status = 'Completed' AND t.CompletedDate IS NOT NULL AND t.StartDate IS NOT NULL THEN DATEDIFF(day, t.StartDate, t.CompletedDate) ELSE NULL END) AS AvgCompletionDays,
        SUM(t.EstimatedHours) AS TotalEstimatedHours,
        SUM(t.ActualHours) AS TotalActualHours
       FROM dbo.Tasks t
       WHERE ${whereSql}`, params);
        res.json({
            success: true,
            data: {
                records: records.recordset,
                summary: summary.recordset[0] || {},
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function getDateReports(req, res, next) {
    try {
        const scopeIds = req.tenant?.scopeCompanyIds || [req.user.companyId];
        const { categoryId, departmentId, range } = req.query; // 7, 15, 30, 60, 90, expired, all
        const dScope = scopeIds.length === 1 ? `d.CompanyID = ${scopeIds[0]}` : `d.CompanyID IN (${scopeIds.join(', ')})`;
        let whereSql = `${dScope} AND d.IsDeleted = 0`;
        const params = {};
        if (categoryId) {
            whereSql += ` AND d.CategoryID = @categoryId`;
            params.categoryId = parseInt(categoryId, 10);
        }
        if (departmentId) {
            whereSql += ` AND d.DepartmentID = @departmentId`;
            params.departmentId = parseInt(departmentId, 10);
        }
        if (range === '7') {
            whereSql += ` AND DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 0 AND 7 AND d.Status = 'Active'`;
        }
        else if (range === '15') {
            whereSql += ` AND DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 0 AND 15 AND d.Status = 'Active'`;
        }
        else if (range === '30') {
            whereSql += ` AND DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 0 AND 30 AND d.Status = 'Active'`;
        }
        else if (range === '60') {
            whereSql += ` AND DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 0 AND 60 AND d.Status = 'Active'`;
        }
        else if (range === '90') {
            whereSql += ` AND DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) BETWEEN 0 AND 90 AND d.Status = 'Active'`;
        }
        else if (range === 'expired') {
            whereSql += ` AND ISNULL(d.ExpiryDate, d.Date) < CAST(GETDATE() AS DATE) AND d.Status = 'Active'`;
        }
        const records = await (0, db_1.executeQuery)(`SELECT 
        d.ImportantDateID, d.Title, d.Date, d.ExpiryDate, d.RecurrenceType, d.Priority, d.Status,
        d.ReferenceNumber, d.RelatedVendor, d.RelatedCustomer,
        c.CategoryName, c.ColorCode,
        dep.DepartmentName,
        comp.CompanyName, comp.CompanyCode,
        e.EmployeeName AS ResponsiblePerson,
        DATEDIFF(day, CAST(GETDATE() AS DATE), ISNULL(d.ExpiryDate, d.Date)) AS DaysRemaining
       FROM dbo.ImportantDates d
       JOIN dbo.ImportantDateCategories c ON d.CategoryID = c.CategoryID
       JOIN dbo.Companies comp ON d.CompanyID = comp.CompanyID
       LEFT JOIN dbo.Departments dep ON d.DepartmentID = dep.DepartmentID
       LEFT JOIN dbo.Employees e ON d.ResponsibleEmployeeID = e.EmployeeID
       WHERE ${whereSql}
       ORDER BY ISNULL(d.ExpiryDate, d.Date) ASC`, params);
        const renewalHistory = await (0, db_1.executeQuery)(`SELECT 
        h.HistoryID, h.ImportantDateID, h.PreviousExpiryDate, h.NewExpiryDate, h.RenewedDate, h.Remarks,
        d.Title, c.CategoryName,
        u.Username AS RenewedByUsername
       FROM dbo.ImportantDateHistory h
       JOIN dbo.ImportantDates d ON h.ImportantDateID = d.ImportantDateID
       JOIN dbo.ImportantDateCategories c ON d.CategoryID = c.CategoryID
       LEFT JOIN dbo.Users u ON h.RenewedByUserID = u.UserID
       WHERE ${dScope}
       ORDER BY h.RenewedDate DESC`);
        res.json({
            success: true,
            data: {
                records: records.recordset,
                renewalHistory: renewalHistory.recordset,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function getEmployeePerformance(req, res, next) {
    try {
        const scopeIds = req.tenant?.scopeCompanyIds || [req.user.companyId];
        const eScope = scopeIds.length === 1 ? `e.CompanyID = ${scopeIds[0]}` : `e.CompanyID IN (${scopeIds.join(', ')})`;
        const data = await (0, db_1.executeQuery)(`SELECT 
        e.EmployeeID, e.EmployeeCode, e.EmployeeName, e.Designation,
        d.DepartmentName,
        comp.CompanyName, comp.CompanyCode,
        COUNT(ta.TaskID) AS TotalAssigned,
        COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) AS CompletedTasks,
        COUNT(CASE WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 1 END) AS OverdueTasks,
        COUNT(CASE WHEN t.Status IN ('New', 'Pending', 'In Progress', 'Waiting for Approval') THEN 1 END) AS PendingTasks,
        COUNT(CASE WHEN t.Status = 'Completed' AND CAST(t.CompletedDate AS DATE) <= t.DueDate THEN 1 END) AS CompletedOnTime,
        COUNT(CASE WHEN t.Status = 'Completed' AND CAST(t.CompletedDate AS DATE) > t.DueDate THEN 1 END) AS CompletedLate,
        CAST(CASE WHEN COUNT(ta.TaskID) > 0 
             THEN (COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) * 100.0 / COUNT(ta.TaskID)) 
             ELSE 0 END AS DECIMAL(5,1)) AS CompletionRatePercentage,
        SUM(t.ActualHours) AS TotalActualHoursLogged
       FROM dbo.Employees e
       JOIN dbo.Companies comp ON e.CompanyID = comp.CompanyID
       LEFT JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID
       LEFT JOIN dbo.TaskAssignees ta ON e.EmployeeID = ta.EmployeeID
       LEFT JOIN dbo.Tasks t ON ta.TaskID = t.TaskID AND t.IsDeleted = 0
       WHERE ${eScope} AND e.Status = 'Active' AND e.IsDeleted = 0
       GROUP BY e.EmployeeID, e.EmployeeCode, e.EmployeeName, e.Designation, d.DepartmentName, comp.CompanyName, comp.CompanyCode
       ORDER BY TotalAssigned DESC`);
        res.json({ success: true, data: data.recordset });
    }
    catch (err) {
        next(err);
    }
}
async function getDepartmentPerformance(req, res, next) {
    try {
        const scopeIds = req.tenant?.scopeCompanyIds || [req.user.companyId];
        const depScope = scopeIds.length === 1 ? `d.CompanyID = ${scopeIds[0]}` : `d.CompanyID IN (${scopeIds.join(', ')})`;
        const data = await (0, db_1.executeQuery)(`SELECT 
        d.DepartmentID, d.DepartmentCode, d.DepartmentName,
        comp.CompanyName, comp.CompanyCode,
        e.EmployeeName AS DepartmentHead,
        COUNT(t.TaskID) AS TotalTasks,
        COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) AS CompletedTasks,
        COUNT(CASE WHEN (t.Status = 'Overdue' OR (t.DueDate < CAST(GETDATE() AS DATE) AND t.Status NOT IN ('Completed', 'Cancelled'))) THEN 1 END) AS OverdueTasks,
        COUNT(CASE WHEN t.Priority = 'Critical' THEN 1 END) AS CriticalTasks,
        CAST(CASE WHEN COUNT(t.TaskID) > 0 
             THEN (COUNT(CASE WHEN t.Status = 'Completed' THEN 1 END) * 100.0 / COUNT(t.TaskID)) 
             ELSE 0 END AS DECIMAL(5,1)) AS CompletionRatePercentage
       FROM dbo.Departments d
       JOIN dbo.Companies comp ON d.CompanyID = comp.CompanyID
       LEFT JOIN dbo.Employees e ON d.DepartmentHeadID = e.EmployeeID
       LEFT JOIN dbo.Tasks t ON d.DepartmentID = t.DepartmentID AND t.IsDeleted = 0
       WHERE ${depScope} AND d.IsDeleted = 0
       GROUP BY d.DepartmentID, d.DepartmentCode, d.DepartmentName, comp.CompanyName, comp.CompanyCode, e.EmployeeName
       ORDER BY TotalTasks DESC`);
        res.json({ success: true, data: data.recordset });
    }
    catch (err) {
        next(err);
    }
}
