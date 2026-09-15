import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { tenantMiddleware, requireModule } from '../middleware/tenant.middleware';
import { requirePermission, requireRole, requirePlatformAdmin } from '../middleware/rbac.middleware';
import { upload } from '../middleware/upload.middleware';

import * as authCtrl from '../controllers/auth.controller';
import * as platformCtrl from '../controllers/platform.controller';
import * as regCtrl from '../controllers/registration.controller';
import * as dashCtrl from '../controllers/dashboard.controller';
import * as compCtrl from '../controllers/companies.controller';
import * as taskCtrl from '../controllers/tasks.controller';
import * as dateCtrl from '../controllers/importantDates.controller';
import * as calCtrl from '../controllers/calendar.controller';
import * as repCtrl from '../controllers/reports.controller';
import * as mastCtrl from '../controllers/masters.controller';
import * as notifCtrl from '../controllers/notifications.controller';
import * as audCtrl from '../controllers/audit.controller';
import * as setCtrl from '../controllers/settings.controller';
import { runDailyMaintenanceJob } from '../jobs/scheduler.job';

const router = Router();

// ==========================================
// AUTHENTICATION ROUTES (Public)
// ==========================================
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticate, tenantMiddleware, authCtrl.getMe);
router.post('/auth/change-password', authenticate, tenantMiddleware, authCtrl.changePassword);
router.post('/auth/logout', authenticate, tenantMiddleware, authCtrl.logout);

// ==========================================
// PUBLIC REGISTRATION ROUTES (No Auth)
// ==========================================
router.get('/register/:token', regCtrl.validateRegistrationToken);
router.post('/register/:token', regCtrl.submitRegistration);

// ==========================================
// ALL PROTECTED ROUTES USE AUTH + TENANT MIDDLEWARE
// ==========================================
router.use(authenticate, tenantMiddleware);

// ==========================================
// PLATFORM ADMIN ROUTES (requirePlatformAdmin)
// ==========================================
router.get('/platform/dashboard', requirePlatformAdmin(), platformCtrl.getPlatformDashboard);
router.get('/platform/tenants', requirePlatformAdmin(), platformCtrl.getTenants);
router.post('/platform/tenants', requirePlatformAdmin(), platformCtrl.createTenant);
router.get('/platform/tenants/:id', requirePlatformAdmin(), platformCtrl.getTenantById);
router.put('/platform/tenants/:id', requirePlatformAdmin(), platformCtrl.updateTenant);
router.post('/platform/tenants/:id/suspend', requirePlatformAdmin(), platformCtrl.suspendTenant);
router.post('/platform/tenants/:id/activate', requirePlatformAdmin(), platformCtrl.activateTenant);
router.post('/platform/tenants/:id/reset-password', requirePlatformAdmin(), platformCtrl.resetTenantAdminPassword);
router.get('/platform/users', requirePlatformAdmin(), platformCtrl.getAllUsers);
router.post('/platform/registrations', requirePlatformAdmin(), platformCtrl.createRegistrationLink);
router.get('/platform/registrations', requirePlatformAdmin(), platformCtrl.getRegistrations);
router.get('/platform/registrations/:id', requirePlatformAdmin(), platformCtrl.getRegistrationById);
router.post('/platform/registrations/:id/approve', requirePlatformAdmin(), platformCtrl.approveRegistration);
router.post('/platform/registrations/:id/reject', requirePlatformAdmin(), platformCtrl.rejectRegistration);

// ==========================================
// COMPANIES & MULTI-TENANT HIERARCHY
// ==========================================
router.get('/companies/tree', compCtrl.getCompanyHierarchyTree);
router.get('/companies/accessible', compCtrl.getAccessibleCompanies);
router.get('/companies', compCtrl.getCompanies);
router.get('/companies/:id', compCtrl.getCompanyById);
router.post('/companies', requireRole('Super Admin', 'Group Admin', 'Company Admin'), compCtrl.createCompany);
router.put('/companies/:id', requireRole('Super Admin', 'Group Admin', 'Company Admin'), compCtrl.updateCompany);
router.post('/companies/:id/users', requireRole('Super Admin', 'Company Admin'), compCtrl.assignUserToCompany);
router.delete('/companies/:id/users/:userId', requireRole('Super Admin', 'Company Admin'), compCtrl.removeUserFromCompany);

// ==========================================
// DASHBOARD
// ==========================================
router.get('/dashboard', dashCtrl.getDashboardData);

// ==========================================
// TASKS (Guarded by requireModule('tasks'))
// ==========================================
router.get('/tasks', requireModule('tasks'), requirePermission('tasks.view'), taskCtrl.getTasks);
router.get('/tasks/templates', requireModule('tasks'), taskCtrl.getTemplates);
router.post('/tasks/templates', requireModule('tasks'), requireRole('Super Admin', 'Company Admin', 'Department Manager'), taskCtrl.createTemplate);
router.post('/tasks/bulk', requireModule('tasks'), requirePermission('tasks.bulk_actions'), taskCtrl.bulkTaskAction);
router.get('/tasks/:id', requireModule('tasks'), requirePermission('tasks.view'), taskCtrl.getTaskById);
router.post('/tasks', requireModule('tasks'), requirePermission('tasks.create'), taskCtrl.createTask);
router.put('/tasks/:id', requireModule('tasks'), requirePermission('tasks.edit'), taskCtrl.updateTask);
router.delete('/tasks/:id', requireModule('tasks'), requirePermission('tasks.delete'), taskCtrl.deleteTask);
router.post('/tasks/:id/progress', requireModule('tasks'), requirePermission('tasks.update_progress'), taskCtrl.updateProgress);
router.post('/tasks/:id/comments', requireModule('tasks'), taskCtrl.addComment);
router.post('/tasks/:id/attachments', requireModule('tasks'), upload.single('file'), taskCtrl.uploadTaskAttachment);
router.post('/tasks/:id/approve', requireModule('tasks'), requirePermission('tasks.approve'), taskCtrl.approveTask);
router.post('/tasks/:id/reject', requireModule('tasks'), requirePermission('tasks.approve'), taskCtrl.rejectTask);

// ==========================================
// IMPORTANT DATES (Guarded by requireModule('dates'))
// ==========================================
router.get('/important-dates', requireModule('dates'), requirePermission('dates.view'), dateCtrl.getImportantDates);
router.get('/important-dates/categories', requireModule('dates'), dateCtrl.getCategories);
router.post('/important-dates/categories', requireModule('dates'), requireRole('Super Admin', 'Company Admin'), dateCtrl.createCategory);
router.get('/important-dates/:id', requireModule('dates'), requirePermission('dates.view'), dateCtrl.getImportantDateById);
router.post('/important-dates', requireModule('dates'), requirePermission('dates.create'), dateCtrl.createImportantDate);
router.put('/important-dates/:id', requireModule('dates'), requirePermission('dates.edit'), dateCtrl.updateImportantDate);
router.post('/important-dates/:id/renew', requireModule('dates'), requirePermission('dates.renew'), dateCtrl.renewImportantDate);
router.delete('/important-dates/:id', requireModule('dates'), requirePermission('dates.delete'), dateCtrl.deleteImportantDate);

// ==========================================
// CALENDAR (Guarded by requireModule('calendar'))
// ==========================================
router.get('/calendar', requireModule('calendar'), calCtrl.getCalendarEvents);

// ==========================================
// REPORTS & ANALYTICS (Guarded by requireModule('reports'))
// ==========================================
router.get('/reports/tasks', requireModule('reports'), requirePermission('reports.view'), repCtrl.getTaskReports);
router.get('/reports/important-dates', requireModule('reports'), requirePermission('reports.view'), repCtrl.getDateReports);
router.get('/reports/employee-performance', requireModule('reports'), requirePermission('reports.view'), repCtrl.getEmployeePerformance);
router.get('/reports/department-performance', requireModule('reports'), requirePermission('reports.view'), repCtrl.getDepartmentPerformance);

// ==========================================
// NOTIFICATIONS
// ==========================================
router.get('/notifications', notifCtrl.getNotifications);
router.put('/notifications/:id/read', notifCtrl.markAsRead);
router.put('/notifications/mark-all-read', notifCtrl.markAllAsRead);

// ==========================================
// AUDIT LOGS (Guarded by requireModule('audit'))
// ==========================================
router.get('/audit-logs', requireModule('audit'), requirePermission('audit.view'), audCtrl.getAuditLogs);

// ==========================================
// SETTINGS & RULES
// ==========================================
router.get('/settings', setCtrl.getSettings);
router.post('/settings/reminders', requirePermission('settings.manage'), setCtrl.saveReminderRules);
router.post('/settings/escalations', requirePermission('settings.manage'), setCtrl.saveEscalationRules);
router.post('/settings/task-categories', requirePermission('settings.manage'), setCtrl.createTaskCategory);
router.post('/settings/trigger-scheduler', requireRole('Super Admin', 'Company Admin'), async (req, res) => {
  await runDailyMaintenanceJob();
  res.json({ success: true, message: 'Scheduler maintenance job executed successfully.' });
});

// ==========================================
// MASTERS
// ==========================================
router.get('/masters/company', mastCtrl.getCompany);
router.put('/masters/company', requirePermission('masters.manage'), mastCtrl.updateCompany);

router.get('/masters/locations', mastCtrl.getLocations);
router.post('/masters/locations', requirePermission('masters.manage'), mastCtrl.createLocation);

router.get('/masters/departments', mastCtrl.getDepartments);
router.post('/masters/departments', requirePermission('masters.manage'), mastCtrl.createDepartment);

router.get('/masters/employees', mastCtrl.getEmployees);
router.post('/masters/employees', requirePermission('masters.manage'), mastCtrl.createEmployee);

router.get('/masters/roles', mastCtrl.getRolesAndPermissions);
router.put('/masters/roles/:roleId/permissions', requirePermission('roles.manage'), mastCtrl.updateRolePermissions);

router.get('/masters/users', mastCtrl.getUsers);

export default router;
