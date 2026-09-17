import axios from 'axios';
import {
  User,
  Company,
  Tenant,
  TenantRegistration,
  Location,
  Department,
  Employee,
  Role,
  Permission,
  TaskItem,
  TaskTemplate,
  ImportantDateItem,
  ImportantDateCategory,
  CalendarEventItem,
  NotificationItem,
  DashboardData,
  UserCompanyRightsUser,
  UserCompanyRightsData,
  SaveUserCompanyRightsPayload,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer Token and Active Company ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeCompanyId = localStorage.getItem('active_company_id');
    if (activeCompanyId && config.headers) {
      config.headers['X-Company-ID'] = activeCompanyId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================================================
// AUTH API
// ========================================================
export const authApi = {
  login: async (usernameOrEmail: string, password: string): Promise<{ token: string; user: User; mustChangePassword?: boolean }> => {
    const res = await api.post('/auth/login', { usernameOrEmail, password });
    return res.data;
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
};

// ========================================================
// DASHBOARD API
// ========================================================
export const dashboardApi = {
  getDashboardData: async (): Promise<{ data: DashboardData }> => {
    const res = await api.get('/dashboard');
    return res.data;
  },
};

// ========================================================
// TASKS API
// ========================================================
export const tasksApi = {
  getTasks: async (params: Record<string, any> = {}) => {
    const res = await api.get('/tasks', { params });
    return res.data;
  },
  getTaskById: async (id: number): Promise<{ data: TaskItem }> => {
    const res = await api.get(`/tasks/${id}`);
    return res.data;
  },
  createTask: async (taskData: any) => {
    const res = await api.post('/tasks', taskData);
    return res.data;
  },
  updateTask: async (id: number, taskData: any) => {
    const res = await api.put(`/tasks/${id}`, taskData);
    return res.data;
  },
  deleteTask: async (id: number) => {
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  },
  updateProgress: async (id: number, progressData: any) => {
    const res = await api.post(`/tasks/${id}/progress`, progressData);
    return res.data;
  },
  addComment: async (id: number, commentText: string, mentionedUserIds?: number[]) => {
    const res = await api.post(`/tasks/${id}/comments`, { commentText, mentionedUserIds });
    return res.data;
  },
  uploadAttachment: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/tasks/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  approveTask: async (id: number) => {
    const res = await api.post(`/tasks/${id}/approve`);
    return res.data;
  },
  rejectTask: async (id: number, reason: string) => {
    const res = await api.post(`/tasks/${id}/reject`, { reason });
    return res.data;
  },
  bulkAction: async (taskIds: number[], action: string, value: any) => {
    const res = await api.post('/tasks/bulk', { taskIds, action, value });
    return res.data;
  },
  getTemplates: async (): Promise<{ data: TaskTemplate[] }> => {
    const res = await api.get('/tasks/templates');
    return res.data;
  },
  createTemplate: async (templateData: any) => {
    const res = await api.post('/tasks/templates', templateData);
    return res.data;
  },
};

// ========================================================
// IMPORTANT DATES API
// ========================================================
export const importantDatesApi = {
  getImportantDates: async (params: Record<string, any> = {}) => {
    const res = await api.get('/important-dates', { params });
    return res.data;
  },
  getDateById: async (id: number): Promise<{ data: ImportantDateItem }> => {
    const res = await api.get(`/important-dates/${id}`);
    return res.data;
  },
  createDate: async (dateData: any) => {
    const res = await api.post('/important-dates', dateData);
    return res.data;
  },
  updateDate: async (id: number, dateData: any) => {
    const res = await api.put(`/important-dates/${id}`, dateData);
    return res.data;
  },
  renewDate: async (id: number, renewalData: { newExpiryDate: string; renewedDate: string; remarks?: string; attachmentUrl?: string }) => {
    const res = await api.post(`/important-dates/${id}/renew`, renewalData);
    return res.data;
  },
  deleteDate: async (id: number) => {
    const res = await api.delete(`/important-dates/${id}`);
    return res.data;
  },
  getCategories: async (): Promise<{ data: ImportantDateCategory[] }> => {
    const res = await api.get('/important-dates/categories');
    return res.data;
  },
  createCategory: async (categoryData: any) => {
    const res = await api.post('/important-dates/categories', categoryData);
    return res.data;
  },
};

// ========================================================
// CALENDAR API
// ========================================================
export const calendarApi = {
  getEvents: async (params: Record<string, any> = {}): Promise<{ data: CalendarEventItem[] }> => {
    const res = await api.get('/calendar', { params });
    return res.data;
  },
};

// ========================================================
// REPORTS API
// ========================================================
export const reportsApi = {
  getTaskReports: async (params: Record<string, any> = {}) => {
    const res = await api.get('/reports/tasks', { params });
    return res.data;
  },
  getDateReports: async (params: Record<string, any> = {}) => {
    const res = await api.get('/reports/important-dates', { params });
    return res.data;
  },
  getEmployeePerformance: async () => {
    const res = await api.get('/reports/employee-performance');
    return res.data;
  },
  getDepartmentPerformance: async () => {
    const res = await api.get('/reports/department-performance');
    return res.data;
  },
};

// ========================================================
// NOTIFICATIONS API
// ========================================================
export const notificationsApi = {
  getNotifications: async (params: Record<string, any> = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },
  markAsRead: async (id: number) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.put('/notifications/mark-all-read');
    return res.data;
  },
};

// ========================================================
// MASTERS API
// ========================================================
export const mastersApi = {
  getCompany: async (): Promise<{ data: Company }> => {
    const res = await api.get('/masters/company');
    return res.data;
  },
  updateCompany: async (data: any) => {
    const res = await api.put('/masters/company', data);
    return res.data;
  },
  getLocations: async (): Promise<{ data: Location[] }> => {
    const res = await api.get('/masters/locations');
    return res.data;
  },
  createLocation: async (data: any) => {
    const res = await api.post('/masters/locations', data);
    return res.data;
  },
  getDepartments: async (): Promise<{ data: Department[] }> => {
    const res = await api.get('/masters/departments');
    return res.data;
  },
  createDepartment: async (data: any) => {
    const res = await api.post('/masters/departments', data);
    return res.data;
  },
  getEmployees: async (): Promise<{ data: Employee[] }> => {
    const res = await api.get('/masters/employees');
    return res.data;
  },
  createEmployee: async (data: any) => {
    const res = await api.post('/masters/employees', data);
    return res.data;
  },
  updateEmployee: async (id: number, data: any) => {
    const res = await api.put(`/masters/employees/${id}`, data);
    return res.data;
  },
  deleteEmployee: async (id: number) => {
    const res = await api.delete(`/masters/employees/${id}`);
    return res.data;
  },
  getRoles: async (): Promise<{ data: { roles: Role[]; permissions: Permission[]; rolePermissions: { RoleID: number; PermissionID: number }[] } }> => {
    const res = await api.get('/masters/roles');
    return res.data;
  },
  updateRolePermissions: async (roleId: number, permissionIds: number[]) => {
    const res = await api.put(`/masters/roles/${roleId}/permissions`, { permissionIds });
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/masters/users');
    return res.data;
  },
};

// ========================================================
// SETTINGS & AUDIT API
// ========================================================
export const settingsApi = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  saveReminderRules: async (rules: any[]) => {
    const res = await api.post('/settings/reminders', { rules });
    return res.data;
  },
  saveEscalationRules: async (rules: any[]) => {
    const res = await api.post('/settings/escalations', { rules });
    return res.data;
  },
  createTaskCategory: async (data: any) => {
    const res = await api.post('/settings/task-categories', data);
    return res.data;
  },
  triggerScheduler: async () => {
    const res = await api.post('/settings/trigger-scheduler');
    return res.data;
  },
  getAuditLogs: async (params: Record<string, any> = {}) => {
    const res = await api.get('/audit-logs', { params });
    return res.data;
  },
};

// ========================================================
// COMPANIES & MULTI-TENANT HIERARCHY API
// ========================================================
export const companiesApi = {
  getCompanyTree: async () => {
    const res = await api.get('/companies/tree');
    return res.data;
  },
  getAccessibleCompanies: async () => {
    const res = await api.get('/companies/accessible');
    return res.data;
  },
  getCompanies: async (params: Record<string, any> = {}) => {
    const res = await api.get('/companies', { params });
    return res.data;
  },
  getCompanyById: async (id: number) => {
    const res = await api.get(`/companies/${id}`);
    return res.data;
  },
  createCompany: async (data: any) => {
    const res = await api.post('/companies', data);
    return res.data;
  },
  updateCompany: async (id: number, data: any) => {
    const res = await api.put(`/companies/${id}`, data);
    return res.data;
  },
  assignUserToCompany: async (companyId: number, data: any) => {
    const res = await api.post(`/companies/${companyId}/users`, data);
    return res.data;
  },
  removeUserFromCompany: async (companyId: number, userId: number) => {
    const res = await api.delete(`/companies/${companyId}/users/${userId}`);
    return res.data;
  },
};

// ========================================================
// PLATFORM ADMIN API
// ========================================================
export const platformApi = {
  getDashboard: async () => {
    const res = await api.get('/platform/dashboard');
    return res.data;
  },
  getTenants: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const res = await api.get('/platform/tenants', { params });
    return res.data;
  },
  getTenantById: async (id: number) => {
    const res = await api.get(`/platform/tenants/${id}`);
    return res.data;
  },
  createTenant: async (data: Partial<Tenant>) => {
    const res = await api.post('/platform/tenants', data);
    return res.data;
  },
  updateTenant: async (id: number, data: Partial<Tenant>) => {
    const res = await api.put(`/platform/tenants/${id}`, data);
    return res.data;
  },
  suspendTenant: async (id: number) => {
    const res = await api.post(`/platform/tenants/${id}/suspend`);
    return res.data;
  },
  activateTenant: async (id: number) => {
    const res = await api.post(`/platform/tenants/${id}/activate`);
    return res.data;
  },
  resetTenantAdminPassword: async (id: number, newPassword: string) => {
    const res = await api.post(`/platform/tenants/${id}/reset-password`, { newPassword });
    return res.data;
  },
  getAllUsers: async (params?: { search?: string; tenantId?: number; page?: number; limit?: number }) => {
    const res = await api.get('/platform/users', { params });
    return res.data;
  },
  createRegistrationLink: async (data?: { expiresInDays?: number; notes?: string }) => {
    const res = await api.post('/platform/registrations', data || {});
    return res.data;
  },
  getRegistrations: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await api.get('/platform/registrations', { params });
    return res.data;
  },
  getRegistrationById: async (id: number) => {
    const res = await api.get(`/platform/registrations/${id}`);
    return res.data;
  },
  approveRegistration: async (id: number) => {
    const res = await api.post(`/platform/registrations/${id}/approve`);
    return res.data;
  },
  rejectRegistration: async (id: number, reason: string) => {
    const res = await api.post(`/platform/registrations/${id}/reject`, { reason });
    return res.data;
  },
};

// ========================================================
// PUBLIC REGISTRATION API (No Auth)
// ========================================================
export const registrationApi = {
  validateToken: async (token: string) => {
    const res = await api.get(`/register/${token}`);
    return res.data;
  },
  submitRegistration: async (token: string, data: any) => {
    const res = await api.post(`/register/${token}`, data);
    return res.data;
  },
};

// ========================================================
// USER COMPANY RIGHTS API (tbl_user_companies)
// ========================================================
export const userCompanyRightsApi = {
  getUsers: async (): Promise<{ success: boolean; data: UserCompanyRightsUser[] }> => {
    const res = await api.get('/user-company-rights/users');
    return res.data;
  },
  getUserRights: async (userId: number): Promise<{ success: boolean; data: UserCompanyRightsData }> => {
    const res = await api.get(`/user-company-rights/${userId}`);
    return res.data;
  },
  saveUserRights: async (userId: number, payload: SaveUserCompanyRightsPayload): Promise<{ success: boolean; message: string; data: any }> => {
    const res = await api.post(`/user-company-rights/${userId}`, payload);
    return res.data;
  },
};

export default api;
