"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const authCtrl = __importStar(require("../controllers/auth.controller"));
const platformCtrl = __importStar(require("../controllers/platform.controller"));
const regCtrl = __importStar(require("../controllers/registration.controller"));
const dashCtrl = __importStar(require("../controllers/dashboard.controller"));
const compCtrl = __importStar(require("../controllers/companies.controller"));
const taskCtrl = __importStar(require("../controllers/tasks.controller"));
const dateCtrl = __importStar(require("../controllers/importantDates.controller"));
const calCtrl = __importStar(require("../controllers/calendar.controller"));
const repCtrl = __importStar(require("../controllers/reports.controller"));
const mastCtrl = __importStar(require("../controllers/masters.controller"));
const notifCtrl = __importStar(require("../controllers/notifications.controller"));
const audCtrl = __importStar(require("../controllers/audit.controller"));
const setCtrl = __importStar(require("../controllers/settings.controller"));
const scheduler_job_1 = require("../jobs/scheduler.job");
const router = (0, express_1.Router)();
// ==========================================
// AUTHENTICATION ROUTES (Public)
// ==========================================
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', auth_middleware_1.authenticate, tenant_middleware_1.tenantMiddleware, authCtrl.getMe);
router.post('/auth/change-password', auth_middleware_1.authenticate, tenant_middleware_1.tenantMiddleware, authCtrl.changePassword);
router.post('/auth/logout', auth_middleware_1.authenticate, tenant_middleware_1.tenantMiddleware, authCtrl.logout);
// ==========================================
// PUBLIC REGISTRATION ROUTES (No Auth)
// ==========================================
router.get('/register/:token', regCtrl.validateRegistrationToken);
router.post('/register/:token', regCtrl.submitRegistration);
// ==========================================
// ALL PROTECTED ROUTES USE AUTH + TENANT MIDDLEWARE
// ==========================================
router.use(auth_middleware_1.authenticate, tenant_middleware_1.tenantMiddleware);
// ==========================================
// PLATFORM ADMIN ROUTES (requirePlatformAdmin)
// ==========================================
router.get('/platform/dashboard', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.getPlatformDashboard);
router.get('/platform/tenants', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.getTenants);
router.post('/platform/tenants', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.createTenant);
router.get('/platform/tenants/:id', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.getTenantById);
router.put('/platform/tenants/:id', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.updateTenant);
router.post('/platform/tenants/:id/suspend', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.suspendTenant);
router.post('/platform/tenants/:id/activate', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.activateTenant);
router.post('/platform/tenants/:id/reset-password', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.resetTenantAdminPassword);
router.get('/platform/users', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.getAllUsers);
router.post('/platform/registrations', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.createRegistrationLink);
router.get('/platform/registrations', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.getRegistrations);
router.get('/platform/registrations/:id', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.getRegistrationById);
router.post('/platform/registrations/:id/approve', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.approveRegistration);
router.post('/platform/registrations/:id/reject', (0, rbac_middleware_1.requirePlatformAdmin)(), platformCtrl.rejectRegistration);
// ==========================================
// COMPANIES & MULTI-TENANT HIERARCHY
// ==========================================
router.get('/companies/tree', compCtrl.getCompanyHierarchyTree);
router.get('/companies/accessible', compCtrl.getAccessibleCompanies);
router.get('/companies', compCtrl.getCompanies);
router.get('/companies/:id', compCtrl.getCompanyById);
router.post('/companies', (0, rbac_middleware_1.requireRole)('Super Admin', 'Group Admin', 'Company Admin'), compCtrl.createCompany);
router.put('/companies/:id', (0, rbac_middleware_1.requireRole)('Super Admin', 'Group Admin', 'Company Admin'), compCtrl.updateCompany);
router.post('/companies/:id/users', (0, rbac_middleware_1.requireRole)('Super Admin', 'Company Admin'), compCtrl.assignUserToCompany);
router.delete('/companies/:id/users/:userId', (0, rbac_middleware_1.requireRole)('Super Admin', 'Company Admin'), compCtrl.removeUserFromCompany);
// ==========================================
// DASHBOARD
// ==========================================
router.get('/dashboard', dashCtrl.getDashboardData);
// ==========================================
// TASKS (Guarded by requireModule('tasks'))
// ==========================================
router.get('/tasks', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.view'), taskCtrl.getTasks);
router.get('/tasks/templates', (0, tenant_middleware_1.requireModule)('tasks'), taskCtrl.getTemplates);
router.post('/tasks/templates', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requireRole)('Super Admin', 'Company Admin', 'Department Manager'), taskCtrl.createTemplate);
router.post('/tasks/bulk', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.bulk_actions'), taskCtrl.bulkTaskAction);
router.get('/tasks/:id', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.view'), taskCtrl.getTaskById);
router.post('/tasks', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.create'), taskCtrl.createTask);
router.put('/tasks/:id', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.edit'), taskCtrl.updateTask);
router.delete('/tasks/:id', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.delete'), taskCtrl.deleteTask);
router.post('/tasks/:id/progress', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.update_progress'), taskCtrl.updateProgress);
router.post('/tasks/:id/comments', (0, tenant_middleware_1.requireModule)('tasks'), taskCtrl.addComment);
router.post('/tasks/:id/attachments', (0, tenant_middleware_1.requireModule)('tasks'), upload_middleware_1.upload.single('file'), taskCtrl.uploadTaskAttachment);
router.post('/tasks/:id/approve', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.approve'), taskCtrl.approveTask);
router.post('/tasks/:id/reject', (0, tenant_middleware_1.requireModule)('tasks'), (0, rbac_middleware_1.requirePermission)('tasks.approve'), taskCtrl.rejectTask);
// ==========================================
// IMPORTANT DATES (Guarded by requireModule('dates'))
// ==========================================
router.get('/important-dates', (0, tenant_middleware_1.requireModule)('dates'), (0, rbac_middleware_1.requirePermission)('dates.view'), dateCtrl.getImportantDates);
router.get('/important-dates/categories', (0, tenant_middleware_1.requireModule)('dates'), dateCtrl.getCategories);
router.post('/important-dates/categories', (0, tenant_middleware_1.requireModule)('dates'), (0, rbac_middleware_1.requireRole)('Super Admin', 'Company Admin'), dateCtrl.createCategory);
router.get('/important-dates/:id', (0, tenant_middleware_1.requireModule)('dates'), (0, rbac_middleware_1.requirePermission)('dates.view'), dateCtrl.getImportantDateById);
router.post('/important-dates', (0, tenant_middleware_1.requireModule)('dates'), (0, rbac_middleware_1.requirePermission)('dates.create'), dateCtrl.createImportantDate);
router.put('/important-dates/:id', (0, tenant_middleware_1.requireModule)('dates'), (0, rbac_middleware_1.requirePermission)('dates.edit'), dateCtrl.updateImportantDate);
router.post('/important-dates/:id/renew', (0, tenant_middleware_1.requireModule)('dates'), (0, rbac_middleware_1.requirePermission)('dates.renew'), dateCtrl.renewImportantDate);
router.delete('/important-dates/:id', (0, tenant_middleware_1.requireModule)('dates'), (0, rbac_middleware_1.requirePermission)('dates.delete'), dateCtrl.deleteImportantDate);
// ==========================================
// CALENDAR (Guarded by requireModule('calendar'))
// ==========================================
router.get('/calendar', (0, tenant_middleware_1.requireModule)('calendar'), calCtrl.getCalendarEvents);
// ==========================================
// REPORTS & ANALYTICS (Guarded by requireModule('reports'))
// ==========================================
router.get('/reports/tasks', (0, tenant_middleware_1.requireModule)('reports'), (0, rbac_middleware_1.requirePermission)('reports.view'), repCtrl.getTaskReports);
router.get('/reports/important-dates', (0, tenant_middleware_1.requireModule)('reports'), (0, rbac_middleware_1.requirePermission)('reports.view'), repCtrl.getDateReports);
router.get('/reports/employee-performance', (0, tenant_middleware_1.requireModule)('reports'), (0, rbac_middleware_1.requirePermission)('reports.view'), repCtrl.getEmployeePerformance);
router.get('/reports/department-performance', (0, tenant_middleware_1.requireModule)('reports'), (0, rbac_middleware_1.requirePermission)('reports.view'), repCtrl.getDepartmentPerformance);
// ==========================================
// NOTIFICATIONS
// ==========================================
router.get('/notifications', notifCtrl.getNotifications);
router.put('/notifications/:id/read', notifCtrl.markAsRead);
router.put('/notifications/mark-all-read', notifCtrl.markAllAsRead);
// ==========================================
// AUDIT LOGS (Guarded by requireModule('audit'))
// ==========================================
router.get('/audit-logs', (0, tenant_middleware_1.requireModule)('audit'), (0, rbac_middleware_1.requirePermission)('audit.view'), audCtrl.getAuditLogs);
// ==========================================
// SETTINGS & RULES
// ==========================================
router.get('/settings', setCtrl.getSettings);
router.post('/settings/reminders', (0, rbac_middleware_1.requirePermission)('settings.manage'), setCtrl.saveReminderRules);
router.post('/settings/escalations', (0, rbac_middleware_1.requirePermission)('settings.manage'), setCtrl.saveEscalationRules);
router.post('/settings/task-categories', (0, rbac_middleware_1.requirePermission)('settings.manage'), setCtrl.createTaskCategory);
router.post('/settings/trigger-scheduler', (0, rbac_middleware_1.requireRole)('Super Admin', 'Company Admin'), async (req, res) => {
    await (0, scheduler_job_1.runDailyMaintenanceJob)();
    res.json({ success: true, message: 'Scheduler maintenance job executed successfully.' });
});
// ==========================================
// MASTERS
// ==========================================
router.get('/masters/company', mastCtrl.getCompany);
router.put('/masters/company', (0, rbac_middleware_1.requirePermission)('masters.manage'), mastCtrl.updateCompany);
router.get('/masters/locations', mastCtrl.getLocations);
router.post('/masters/locations', (0, rbac_middleware_1.requirePermission)('masters.manage'), mastCtrl.createLocation);
router.get('/masters/departments', mastCtrl.getDepartments);
router.post('/masters/departments', (0, rbac_middleware_1.requirePermission)('masters.manage'), mastCtrl.createDepartment);
router.get('/masters/employees', mastCtrl.getEmployees);
router.post('/masters/employees', (0, rbac_middleware_1.requirePermission)('masters.manage'), mastCtrl.createEmployee);
router.put('/masters/employees/:id', (0, rbac_middleware_1.requirePermission)('masters.manage'), mastCtrl.updateEmployee);
router.delete('/masters/employees/:id', (0, rbac_middleware_1.requirePermission)('masters.manage'), mastCtrl.deleteEmployee);
router.get('/masters/roles', mastCtrl.getRolesAndPermissions);
router.put('/masters/roles/:roleId/permissions', (0, rbac_middleware_1.requirePermission)('roles.manage'), mastCtrl.updateRolePermissions);
router.get('/masters/users', mastCtrl.getUsers);
exports.default = router;
