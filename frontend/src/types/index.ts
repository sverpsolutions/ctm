export interface User {
  userId: number;
  companyId: number;
  companyName: string;
  employeeId?: number | null;
  employeeName?: string;
  employeeCode?: string;
  designation?: string;
  departmentId?: number;
  departmentName?: string;
  locationId?: number;
  profilePhoto?: string;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  permissions: string[];
  tenantId?: number | null;
  isPlatformAdmin?: boolean;
}

export interface Tenant {
  TenantID: number;
  TenantCode: string;
  TenantName: string;
  LegalName?: string;
  ContactPerson?: string;
  ContactEmail: string;
  ContactMobile?: string;
  Industry?: string;
  Address?: string;
  City?: string;
  State?: string;
  Country?: string;
  PINCode?: string;
  Website?: string;
  GSTIN?: string;
  PAN?: string;
  Logo?: string;
  SubscriptionTier: string;
  MaxCompanies: number;
  MaxUsers: number;
  LicenseStartDate?: string;
  LicenseEndDate?: string;
  EnabledModules?: string;
  Status: 'Pending' | 'Active' | 'Trial' | 'Suspended' | 'Expired' | 'Cancelled';
  CompanyCount?: number;
  UserCount?: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface TenantRegistration {
  RegistrationID: number;
  TenantID?: number;
  RegistrationToken: string;
  TokenExpiresAt: string;
  CompanyName: string;
  LegalName?: string;
  ContactPerson: string;
  ContactEmail: string;
  ContactMobile?: string;
  Address?: string;
  City?: string;
  State?: string;
  Country?: string;
  PINCode?: string;
  GSTIN?: string;
  PAN?: string;
  Website?: string;
  Industry?: string;
  CompanyType?: string;
  NumBranches?: number;
  NumUsers?: number;
  RequestedModules?: string;
  AdminName?: string;
  AdminEmail?: string;
  AdminUsername?: string;
  Status: 'LinkGenerated' | 'Pending' | 'Approved' | 'Rejected' | 'Expired';
  RejectionReason?: string;
  ReviewedBy?: number;
  ReviewedAt?: string;
  Notes?: string;
  TenantName?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Company {
  CompanyID: number;
  ParentCompanyID?: number | null;
  CompanyCode?: string;
  CompanyName: string;
  LegalName?: string;
  CompanyType?: 'Holding' | 'Subsidiary' | 'Branch' | 'Joint Venture';
  ShortName?: string;
  Address?: string;
  City?: string;
  State?: string;
  Country?: string;
  PINCode?: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  GSTIN?: string;
  PAN?: string;
  Logo?: string;
  EnabledModules?: string[];
  SubscriptionTier?: string;
  MaxUsers?: number;
  FinancialYear?: string;
  TimeZone?: string;
  Status: string;
  ParentCompanyName?: string;
  ChildCompanyCount?: number;
  UserCount?: number;
  TaskCount?: number;
  DateCount?: number;
}

export interface CompanyNode extends Company {
  children?: CompanyNode[];
}

export interface UserCompanyAccess {
  CompanyID: number;
  CompanyName: string;
  CompanyCode: string;
  ParentCompanyID: number | null;
  CompanyType: string;
  RoleID: number;
  RoleName: string;
  AccessScope: 'Own' | 'Hierarchy' | 'Selected' | 'Global';
  IsPrimary: boolean;
  EnabledModules: string[];
}

export interface Location {
  LocationID: number;
  CompanyID: number;
  LocationCode: string;
  LocationName: string;
  Address?: string;
  City?: string;
  State?: string;
  ContactPerson?: string;
  Phone?: string;
  Email?: string;
  Status: string;
}

export interface Department {
  DepartmentID: number;
  CompanyID: number;
  DepartmentCode: string;
  DepartmentName: string;
  DepartmentHeadID?: number;
  DepartmentHeadName?: string;
  Status: string;
}

export interface Employee {
  EmployeeID: number;
  CompanyID: number;
  EmployeeCode: string;
  EmployeeName: string;
  DepartmentID?: number;
  DepartmentName?: string;
  Designation?: string;
  LocationID?: number;
  LocationName?: string;
  Mobile?: string;
  Email: string;
  JoiningDate?: string;
  Birthday?: string;
  WorkAnniversary?: string;
  ManagerID?: number;
  ManagerName?: string;
  UserID?: number;
  Username?: string;
  RoleID?: number;
  RoleName?: string;
  ProfilePhoto?: string;
  Status: string;
}

export interface Role {
  RoleID: number;
  RoleName: string;
  Description?: string;
  IsSystemRole: boolean | number;
}

export interface Permission {
  PermissionID: number;
  PermissionCode: string;
  ModuleName: string;
  Description?: string;
}

export interface TaskCategory {
  CategoryID: number;
  CompanyID?: number;
  CategoryName: string;
  ColorCode: string;
  RequiresApproval: boolean | number;
  Status: string;
}

export interface TaskAssignee {
  EmployeeID: number;
  EmployeeName: string;
  EmployeeCode: string;
  Email: string;
  Designation?: string;
  ProfilePhoto?: string;
}

export interface TaskChecklistItem {
  ChecklistItemID: number;
  TaskID: number;
  Title: string;
  IsCompleted: boolean | number;
  CompletedAt?: string;
  CompletedByName?: string;
  SortOrder: number;
}

export interface TaskUpdateItem {
  UpdateID: number;
  TaskID: number;
  EmployeeID: number;
  EmployeeName: string;
  PreviousStatus?: string;
  NewStatus?: string;
  PreviousProgress?: number;
  NewProgress?: number;
  TimeSpentHours?: number;
  Remarks: string;
  CreatedAt: string;
}

export interface TaskCommentItem {
  CommentID: number;
  TaskID: number;
  UserID: number;
  Username: string;
  EmployeeName?: string;
  ProfilePhoto?: string;
  RoleName?: string;
  CommentText: string;
  MentionedUserIDs?: string;
  CreatedAt: string;
}

export interface TaskAttachmentItem {
  AttachmentID: number;
  TaskID?: number;
  ImportantDateID?: number;
  FileName: string;
  OriginalName: string;
  FileType: string;
  FileSize: number;
  StoragePath: string;
  UploadedByUsername: string;
  CreatedAt: string;
}

export interface TaskActivityItem {
  ActivityID: number;
  TaskID: number;
  UserID: number;
  Username: string;
  ActionType: string;
  FieldName?: string;
  OldValue?: string;
  NewValue?: string;
  Description: string;
  CreatedAt: string;
}

export interface TaskItem {
  TaskID: number;
  TaskNumber: string;
  CompanyID: number;
  CompanyName?: string;
  CompanyCode?: string;
  TaskType?: string;
  ReminderDate?: string;
  Remarks?: string;
  LocationID?: number;
  LocationName?: string;
  DepartmentID?: number;
  DepartmentName?: string;
  CategoryID?: number;
  CategoryName?: string;
  CategoryColor?: string;
  RequiresApproval?: boolean | number;
  TaskTitle: string;
  TaskDescription?: string;
  AssignedByID: number;
  AssignedByUsername?: string;
  ManagerID?: number;
  ManagerName?: string;
  ManagerEmail?: string;
  StartDate?: string;
  DueDate: string;
  Priority: 'Low' | 'Medium' | 'High' | 'Critical';
  Status: 'New' | 'Pending' | 'In Progress' | 'On Hold' | 'Waiting for Approval' | 'Completed' | 'Cancelled' | 'Overdue';
  EffectiveStatus: string;
  PercentageComplete: number;
  EstimatedHours: number;
  ActualHours: number;
  ParentTaskID?: number;
  RelatedImportantDateID?: number;
  RelatedDateTitle?: string;
  RelatedDateExpiry?: string;
  RelatedVendor?: string;
  RelatedCustomer?: string;
  Tags?: string;
  CompletedDate?: string;
  ApprovedByID?: number;
  ApprovedByUsername?: string;
  ApprovedDate?: string;
  RejectionReason?: string;
  AssigneeNames?: string;
  TotalChecklistItems?: number;
  CompletedChecklistItems?: number;
  AttachmentCount?: number;
  CommentCount?: number;
  DaysRemaining?: number;
  CreatedAt: string;
  UpdatedAt: string;
  assignees?: TaskAssignee[];
  checklist?: TaskChecklistItem[];
  updates?: TaskUpdateItem[];
  comments?: TaskCommentItem[];
  attachments?: TaskAttachmentItem[];
  activities?: TaskActivityItem[];
}

export interface TaskTemplate {
  TemplateID: number;
  CompanyID: number;
  DepartmentID?: number;
  DepartmentName?: string;
  CategoryID?: number;
  CategoryName?: string;
  TemplateName: string;
  Description?: string;
  EstimatedHours: number;
  Priority: string;
  ChecklistJSON?: string;
}

export interface ImportantDateCategory {
  CategoryID: number;
  CompanyID?: number;
  CategoryName: string;
  ColorCode: string;
  IconName: string;
  IsSystemDefault: boolean | number;
  Status: string;
}

export interface ImportantDateReminder {
  ReminderID: number;
  ImportantDateID: number;
  DaysBefore: number;
  ReminderChannel: string;
  IsCustomDate?: boolean | number;
  CustomDate?: string;
}

export interface ImportantDateHistoryItem {
  HistoryID: number;
  ImportantDateID: number;
  PreviousExpiryDate: string;
  NewExpiryDate: string;
  RenewedDate: string;
  RenewedByUserID?: number;
  RenewedByUsername?: string;
  Remarks?: string;
  AttachmentURL?: string;
  CreatedAt: string;
}

export interface ImportantDateItem {
  ImportantDateID: number;
  CompanyID: number;
  CompanyName?: string;
  CompanyCode?: string;
  LocationID?: number;
  LocationName?: string;
  DepartmentID?: number;
  DepartmentName?: string;
  CategoryID: number;
  CategoryName: string;
  CategoryColor: string;
  CategoryIcon: string;
  Title: string;
  Description?: string;
  RelatedEmployeeID?: number;
  RelatedEmployeeName?: string;
  RelatedVendor?: string;
  RelatedCustomer?: string;
  ReferenceNumber?: string;
  Date: string;
  StartDate?: string;
  ExpiryDate: string;
  RecurrenceType: string;
  ResponsibleEmployeeID?: number;
  ResponsiblePersonName?: string;
  ResponsiblePersonEmail?: string;
  Priority: 'Low' | 'Medium' | 'High' | 'Critical';
  Notes?: string;
  Attachment?: string;
  AutoGenerateTask: boolean | number;
  LeadDaysForTask: number;
  TaskAssignedToID?: number;
  GeneratedTaskID?: number;
  GeneratedTaskNumber?: string;
  GeneratedTaskStatus?: string;
  GeneratedTaskTitle?: string;
  Status: 'Active' | 'Expired' | 'Renewed' | 'Completed' | 'Cancelled';
  DaysRemaining: number;
  SmartCategory: 'Critical' | 'Urgent' | 'Upcoming' | 'Future' | 'Expired';
  CreatedByUsername?: string;
  CreatedAt: string;
  UpdatedAt: string;
  reminders?: ImportantDateReminder[];
  renewalHistory?: ImportantDateHistoryItem[];
  relatedTasks?: any[];
}

export interface CalendarEventItem {
  id: string;
  referenceId: number;
  title: string;
  start: string;
  end: string;
  type: 'task' | 'date' | 'birthday' | 'anniversary';
  priority?: string;
  status?: string;
  progress?: number;
  department?: string;
  category?: string;
  responsiblePerson?: string;
  color: string;
  generatedTaskId?: number;
  generatedTaskNumber?: string;
  generatedTaskStatus?: string;
  autoGenerateTask?: boolean | number;
}

export interface NotificationItem {
  NotificationID: number;
  UserID: number;
  Title: string;
  Message: string;
  Type: string;
  ReferenceType?: string;
  ReferenceID?: number;
  IsRead: boolean | number;
  ReadAt?: string;
  CreatedAt: string;
}

export interface DashboardData {
  kpis: {
    todayTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    dueToday: number;
    dueThisWeek: number;
    completedTasks: number;
    waitingApprovalTasks: number;
    totalTasks: number;
    totalImportantDates: number;
    expiringSoonDates: number;
    expiredDates: number;
  };
  charts: {
    statusBreakdown: { StatusName: string; TaskCount: number }[];
    departmentBreakdown: { DepartmentName: string; Total: number; Completed: number; Overdue: number; ActiveTasks: number }[];
    priorityBreakdown: { Priority: string; TaskCount: number }[];
    employeePerformance: { EmployeeName: string; TotalAssigned: number; Completed: number; Overdue: number; CompletionRate: number }[];
  };
  upcomingDates: ImportantDateItem[];
  overdueTasks: any[];
  myDayTasks: any[];
}

export interface UserCompanyRightsUser {
  UserID: number;
  Username: string;
  Email: string;
  RoleID: number;
  RoleName: string;
  PrimaryCompanyID: number;
  PrimaryCompanyName?: string;
  PrimaryCompanyCode?: string;
  EmployeeName?: string;
  Designation?: string;
  AssignedCompanyCount: number;
}

export interface CompanyRightItem {
  companyId: number;
  companyCode: string;
  companyName: string;
  legalName?: string;
  companyType: string;
  parentCompanyId?: number | null;
  parentCompanyName?: string | null;
  isAssigned: boolean;
  isPrimary: boolean;
}

export interface UserCompanyRightsData {
  user: {
    userId: number;
    username: string;
    email: string;
    roleId: number;
    roleName: string;
    employeeName?: string;
    designation?: string;
    primaryCompanyId: number;
  };
  companies: CompanyRightItem[];
}

export interface SaveUserCompanyRightsPayload {
  companyIds: number[];
  primaryCompanyId?: number;
}
