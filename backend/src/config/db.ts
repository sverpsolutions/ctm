import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const possibleEnvPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(__dirname, '../../.env.production'),
];
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// Dynamic imports for mssql/sqlite3 — they are optional and may not be installed (e.g. on Linux servers using MySQL only)
let sql: any = null;
let sqlite3: any = null;

async function loadMssql() {
  if (!sql) {
    try { sql = (await import('mssql')).default; } catch { sql = null; }
  }
  return sql;
}

async function loadSqlite3() {
  if (!sqlite3) {
    try { sqlite3 = (await import('sqlite3')).default; } catch { sqlite3 = null; }
  }
  return sqlite3;
}

const isTrusted = process.env.DB_TRUSTED_CONNECTION === 'true';

let mssqlConfig: any = null;

function getMssqlConfig() {
  if (!mssqlConfig) {
    mssqlConfig = {
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_DATABASE || 'CompanyTaskDB',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433,
      user: isTrusted ? undefined : process.env.DB_USER,
      password: isTrusted ? undefined : process.env.DB_PASSWORD,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        enableArithAbort: true,
      },
      connectionTimeout: 2000,
      requestTimeout: 10000,
    };
  }
  return mssqlConfig;
}

let mssqlPool: any = null;
let sqliteDb: any = null;
let mysqlPool: mysql.Pool | null = null;
let activeEngine: 'mssql' | 'sqlite' | 'mysql' | null = null;
let isInitializing = false;

export async function getDbPool(): Promise<any> {
  if (activeEngine === 'mssql' && mssqlPool && mssqlPool.connected) {
    return mssqlPool;
  }
  if (activeEngine === 'sqlite' && sqliteDb) {
    return sqliteDb;
  }
  if (activeEngine === 'mysql' && mysqlPool) {
    return mysqlPool;
  }

  if (activeEngine === null && !isInitializing) {
    isInitializing = true;

    if (process.env.DB_ENGINE === 'mysql' || (!process.env.DB_ENGINE && process.env.MYSQL_DATABASE)) {
      console.log(`[Database] Initializing MySQL/MariaDB connection.`);
      activeEngine = 'mysql';
      const pool = await initMysql();
      isInitializing = false;
      return pool;
    }

    if (process.env.DB_ENGINE === 'sqlite') {
      console.log(`[Database] Initializing Integrated Local Enterprise SQLite Engine (Instant Mode).`);
      activeEngine = 'sqlite';
      const db = await initSqlite();
      isInitializing = false;
      return db;
    }
    try {
      const mssqlModule = await loadMssql();
      if (!mssqlModule) throw new Error('mssql module not available');
      const cfg = getMssqlConfig();
      const testPool = new mssqlModule.ConnectionPool(cfg);
      await testPool.connect();
      mssqlPool = testPool;
      activeEngine = 'mssql';
      isInitializing = false;
      console.log(`[Database] Connected successfully to Microsoft SQL Server (${cfg.server} / ${cfg.database})`);
      return mssqlPool;
    } catch (err: any) {
      console.log(`[Database] SQL Server not available (${err.message}).`);
      console.log(`[Database] Initializing Integrated Local Enterprise SQLite Engine.`);
      activeEngine = 'sqlite';
      const db = await initSqlite();
      isInitializing = false;
      return db;
    }
  }

  if (activeEngine === 'sqlite') {
    return initSqlite();
  }
  if (activeEngine === 'mysql') {
    return mysqlPool;
  }

  return mssqlPool;
}

async function initSqlite(): Promise<any> {
  if (sqliteDb) return sqliteDb;

  const sqlite3Module = await loadSqlite3();
  if (!sqlite3Module) throw new Error('sqlite3 module not available — install sqlite3 or use DB_ENGINE=mysql');

  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '../../database/company_task.db');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    sqliteDb = new sqlite3Module.Database(dbPath, async (err: Error | null) => {
      if (err) {
        return reject(err);
      }
      console.log(`[Database] SQLite Engine active at ${dbPath}`);
      try {
        await initSqliteSchemaAndSeed();
        resolve(sqliteDb!);
      } catch (setupErr) {
        reject(setupErr);
      }
    });
  });
}

async function initMysql(): Promise<mysql.Pool> {
  if (mysqlPool) return mysqlPool;

  mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306', 10),
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'company_task_db',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
  });

  const conn = await mysqlPool.getConnection();
  console.log(`[Database] MySQL/MariaDB connected to ${process.env.MYSQL_HOST || process.env.DB_SERVER || 'localhost'}/${process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'company_task_db'}`);
  conn.release();

  await initMysqlSchemaAndSeed();
  return mysqlPool;
}

async function initMysqlSchemaAndSeed() {
  if (!mysqlPool) return;

  const runSql = async (sqlText: string) => {
    await mysqlPool!.execute(sqlText);
  };

  await runSql(`
    CREATE TABLE IF NOT EXISTS Companies (
      CompanyID INT PRIMARY KEY AUTO_INCREMENT,
      ParentCompanyID INT,
      CompanyCode VARCHAR(100) UNIQUE,
      CompanyName VARCHAR(500) NOT NULL,
      LegalName VARCHAR(500),
      CompanyType VARCHAR(100) DEFAULT 'Subsidiary',
      ShortName VARCHAR(100),
      Address VARCHAR(500),
      City VARCHAR(200),
      State VARCHAR(200),
      Country VARCHAR(200) DEFAULT 'India',
      PINCode VARCHAR(20),
      Phone VARCHAR(50),
      Email VARCHAR(255),
      Website VARCHAR(500),
      GSTIN VARCHAR(50),
      PAN VARCHAR(50),
      Logo VARCHAR(500),
      EnabledModules TEXT,
      SubscriptionTier VARCHAR(100) DEFAULT 'Enterprise',
      MaxUsers INT DEFAULT 100,
      FinancialYear VARCHAR(20) DEFAULT '2026-2027',
      TimeZone VARCHAR(100) DEFAULT 'Asia/Kolkata',
      DefaultReminderSettings TEXT,
      Status VARCHAR(50) DEFAULT 'Active',
      IsDeleted TINYINT DEFAULT 0,
      CreatedBy INT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedBy INT,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      TenantID INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS UserCompany (
      UserCompanyID INT PRIMARY KEY AUTO_INCREMENT,
      UserID INT NOT NULL,
      CompanyID INT NOT NULL,
      RoleID INT NOT NULL,
      AccessScope VARCHAR(50) DEFAULT 'Own',
      IsPrimary TINYINT DEFAULT 0,
      IsActive TINYINT DEFAULT 1,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Departments (
      DepartmentID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      DepartmentName VARCHAR(500) NOT NULL,
      DepartmentCode VARCHAR(100),
      HOD_EmployeeID INT,
      Description TEXT,
      Status VARCHAR(50) DEFAULT 'Active',
      IsDeleted TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Employees (
      EmployeeID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      EmployeeCode VARCHAR(100),
      FullName VARCHAR(500) NOT NULL,
      DepartmentID INT,
      Designation VARCHAR(500),
      LocationID INT DEFAULT 1,
      Phone VARCHAR(50),
      Email VARCHAR(255),
      JoiningDate VARCHAR(20),
      DateOfBirth VARCHAR(20),
      AnniversaryDate VARCHAR(20),
      Status VARCHAR(50) DEFAULT 'Active',
      IsDeleted TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      TenantID INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Roles (
      RoleID INT PRIMARY KEY AUTO_INCREMENT,
      RoleName VARCHAR(200) NOT NULL,
      Description VARCHAR(500),
      IsSystemRole TINYINT DEFAULT 0,
      IsDeleted TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      IsPlatformRole TINYINT DEFAULT 0,
      TenantID INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Permissions (
      PermissionID INT PRIMARY KEY AUTO_INCREMENT,
      PermissionCode VARCHAR(200) UNIQUE NOT NULL,
      PermissionName VARCHAR(500) NOT NULL,
      Module VARCHAR(200),
      Description VARCHAR(500)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS RolePermissions (
      RolePermissionID INT PRIMARY KEY AUTO_INCREMENT,
      RoleID INT NOT NULL,
      PermissionID INT NOT NULL,
      UNIQUE KEY uq_role_perm (RoleID, PermissionID)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Users (
      UserID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT,
      EmployeeID INT,
      Username VARCHAR(255) NOT NULL,
      Email VARCHAR(255),
      PasswordHash VARCHAR(500) NOT NULL,
      RoleID INT,
      Status VARCHAR(50) DEFAULT 'Active',
      LastLoginAt DATETIME,
      FailedLoginAttempts INT DEFAULT 0,
      LockoutUntil DATETIME,
      IsDeleted TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      TenantID INT,
      IsPlatformAdmin TINYINT DEFAULT 0,
      MustChangePassword TINYINT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Locations (
      LocationID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      LocationName VARCHAR(500) NOT NULL,
      LocationCode VARCHAR(100),
      Address VARCHAR(500),
      City VARCHAR(200),
      State VARCHAR(200),
      Country VARCHAR(200) DEFAULT 'India',
      PINCode VARCHAR(20),
      IsHeadOffice TINYINT DEFAULT 0,
      Status VARCHAR(50) DEFAULT 'Active',
      IsDeleted TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS DateCategories (
      CategoryID INT PRIMARY KEY AUTO_INCREMENT,
      CategoryName VARCHAR(500) NOT NULL,
      ColorCode VARCHAR(20),
      Icon VARCHAR(100),
      IsSystem TINYINT DEFAULT 0,
      IsDeleted TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDates (
      ImportantDateID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      CategoryID INT,
      Title VARCHAR(500) NOT NULL,
      Description TEXT,
      EventDate VARCHAR(20) NOT NULL,
      ExpiryDate VARCHAR(20),
      ReminderDaysBefore INT DEFAULT 7,
      IsRecurring TINYINT DEFAULT 0,
      RecurrencePattern VARCHAR(100),
      Priority VARCHAR(50) DEFAULT 'Medium',
      LinkedEmployeeID INT,
      LinkedDepartmentID INT,
      RenewalStatus VARCHAR(50) DEFAULT 'Active',
      LastRenewedDate VARCHAR(20),
      LastRenewedBy INT,
      RenewalRemarks TEXT,
      AttachmentPath VARCHAR(500),
      Status VARCHAR(50) DEFAULT 'Active',
      IsDeleted TINYINT DEFAULT 0,
      CreatedBy INT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedBy INT,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Tasks (
      TaskID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      TaskNumber VARCHAR(100),
      Title VARCHAR(500) NOT NULL,
      TaskDescription TEXT,
      Priority VARCHAR(50) DEFAULT 'Medium',
      Status VARCHAR(50) DEFAULT 'Pending',
      DueDate VARCHAR(20),
      CompletionDate VARCHAR(20),
      AssignedTo INT,
      AssignedBy INT,
      ApprovedBy INT,
      ApprovedAt DATETIME,
      DepartmentID INT,
      LocationID INT,
      EstimatedHours DECIMAL(10,2),
      ActualHours DECIMAL(10,2),
      CompletionPercentage INT DEFAULT 0,
      IsDeleted TINYINT DEFAULT 0,
      CreatedBy INT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedBy INT,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskAssignees (
      TaskAssigneeID INT PRIMARY KEY AUTO_INCREMENT,
      TaskID INT NOT NULL,
      EmployeeID INT NOT NULL,
      AssignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      Status VARCHAR(50) DEFAULT 'Active'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskComments (
      CommentID INT PRIMARY KEY AUTO_INCREMENT,
      TaskID INT NOT NULL,
      UserID INT NOT NULL,
      CommentText TEXT NOT NULL,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskAttachments (
      AttachmentID INT PRIMARY KEY AUTO_INCREMENT,
      TaskID INT NOT NULL,
      FileName VARCHAR(500) NOT NULL,
      FilePath VARCHAR(500) NOT NULL,
      FileSize INT,
      UploadedBy INT NOT NULL,
      UploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskActivities (
      ActivityID INT PRIMARY KEY AUTO_INCREMENT,
      TaskID INT NOT NULL,
      UserID INT,
      ActivityType VARCHAR(200) NOT NULL,
      Description TEXT,
      OldValue TEXT,
      NewValue TEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS AuditLogs (
      AuditID INT PRIMARY KEY AUTO_INCREMENT,
      UserID INT,
      Username VARCHAR(500),
      Action VARCHAR(500) NOT NULL,
      EntityName VARCHAR(500) NOT NULL,
      EntityID INT,
      OldValues LONGTEXT,
      NewValues LONGTEXT,
      IPAddress VARCHAR(100),
      UserAgent TEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      CompanyID INT,
      TenantID INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ReminderRules (
      RuleID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      RuleName VARCHAR(500) NOT NULL,
      CategoryID INT,
      DaysBefore INT DEFAULT 7,
      ReminderType VARCHAR(100) DEFAULT 'Email',
      IsActive TINYINT DEFAULT 1,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS EscalationRules (
      EscalationID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      RuleName VARCHAR(500) NOT NULL,
      TriggerType VARCHAR(100) DEFAULT 'Overdue',
      TriggerDays INT DEFAULT 3,
      EscalateToRoleID INT,
      NotificationType VARCHAR(100) DEFAULT 'Email',
      IsActive TINYINT DEFAULT 1,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Notifications (
      NotificationID INT PRIMARY KEY AUTO_INCREMENT,
      UserID INT NOT NULL,
      CompanyID INT,
      Title VARCHAR(500) NOT NULL,
      Message TEXT,
      Type VARCHAR(100) DEFAULT 'Info',
      ReferenceType VARCHAR(100),
      ReferenceID INT,
      IsRead TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskTemplates (
      TemplateID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      TemplateName VARCHAR(500) NOT NULL,
      Description TEXT,
      Priority VARCHAR(50) DEFAULT 'Medium',
      EstimatedHours DECIMAL(10,2),
      DepartmentID INT,
      IsActive TINYINT DEFAULT 1,
      CreatedBy INT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Tenants (
      TenantID INT PRIMARY KEY AUTO_INCREMENT,
      TenantCode VARCHAR(100) UNIQUE NOT NULL,
      TenantName VARCHAR(500) NOT NULL,
      LegalName VARCHAR(500),
      ContactPerson VARCHAR(500),
      ContactEmail VARCHAR(255) NOT NULL,
      ContactMobile VARCHAR(50),
      Industry VARCHAR(200),
      Address VARCHAR(500),
      City VARCHAR(200),
      State VARCHAR(200),
      Country VARCHAR(200) DEFAULT 'India',
      PINCode VARCHAR(20),
      Website VARCHAR(500),
      GSTIN VARCHAR(50),
      PAN VARCHAR(50),
      Logo VARCHAR(500),
      SubscriptionTier VARCHAR(100) DEFAULT 'Standard',
      MaxCompanies INT DEFAULT 5,
      MaxUsers INT DEFAULT 50,
      LicenseStartDate VARCHAR(20),
      LicenseEndDate VARCHAR(20),
      EnabledModules TEXT,
      Status VARCHAR(50) DEFAULT 'Pending',
      IsDeleted TINYINT DEFAULT 0,
      CreatedBy INT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedBy INT,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TenantRegistrations (
      RegistrationID INT PRIMARY KEY AUTO_INCREMENT,
      TenantID INT,
      RegistrationToken VARCHAR(500) UNIQUE NOT NULL,
      TokenExpiresAt DATETIME NOT NULL,
      CompanyName VARCHAR(500) NOT NULL,
      LegalName VARCHAR(500),
      ContactPerson VARCHAR(500) NOT NULL,
      ContactEmail VARCHAR(255) NOT NULL,
      ContactMobile VARCHAR(50),
      Address VARCHAR(500),
      City VARCHAR(200),
      State VARCHAR(200),
      Country VARCHAR(200) DEFAULT 'India',
      PINCode VARCHAR(20),
      GSTIN VARCHAR(50),
      PAN VARCHAR(50),
      Website VARCHAR(500),
      Industry VARCHAR(200),
      CompanyType VARCHAR(100) DEFAULT 'Subsidiary',
      NumBranches INT DEFAULT 1,
      NumUsers INT DEFAULT 10,
      RequestedModules TEXT,
      AdminName VARCHAR(500),
      AdminEmail VARCHAR(255),
      AdminUsername VARCHAR(255),
      PasswordHash VARCHAR(500),
      Status VARCHAR(50) DEFAULT 'Pending',
      RejectionReason TEXT,
      ReviewedBy INT,
      ReviewedAt DATETIME,
      Notes TEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDateCategories (
      CategoryID INT PRIMARY KEY AUTO_INCREMENT,
      CategoryName VARCHAR(500) NOT NULL,
      ColorCode VARCHAR(50),
      Icon VARCHAR(100),
      IsSystem TINYINT DEFAULT 0,
      IsDeleted TINYINT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDateReminders (
      ReminderID INT PRIMARY KEY AUTO_INCREMENT,
      ImportantDateID INT NOT NULL,
      ReminderDate VARCHAR(20) NOT NULL,
      ReminderType VARCHAR(100) DEFAULT 'Email',
      \`Status\` VARCHAR(50) DEFAULT 'Pending',
      SentAt DATETIME,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDateHistory (
      HistoryID INT PRIMARY KEY AUTO_INCREMENT,
      ImportantDateID INT NOT NULL,
      \`Action\` VARCHAR(200) NOT NULL,
      OldValue LONGTEXT,
      NewValue LONGTEXT,
      ChangedBy INT,
      ChangedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskCategories (
      CategoryID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      CategoryName VARCHAR(500) NOT NULL,
      ColorCode VARCHAR(50),
      Icon VARCHAR(100),
      IsActive TINYINT DEFAULT 1,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskChecklist (
      ChecklistID INT PRIMARY KEY AUTO_INCREMENT,
      TaskID INT NOT NULL,
      ItemText VARCHAR(500) NOT NULL,
      IsCompleted TINYINT DEFAULT 0,
      CompletedBy INT,
      CompletedAt DATETIME,
      SortOrder INT DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskUpdates (
      UpdateID INT PRIMARY KEY AUTO_INCREMENT,
      TaskID INT NOT NULL,
      UserID INT NOT NULL,
      UpdateText LONGTEXT NOT NULL,
      UpdateType VARCHAR(100) DEFAULT 'Comment',
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskActivityLog (
      ActivityID INT PRIMARY KEY AUTO_INCREMENT,
      TaskID INT NOT NULL,
      UserID INT,
      ActivityType VARCHAR(200) NOT NULL,
      Description LONGTEXT,
      OldValue LONGTEXT,
      NewValue LONGTEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS RecurringTasks (
      RecurringTaskID INT PRIMARY KEY AUTO_INCREMENT,
      CompanyID INT NOT NULL,
      DepartmentID INT,
      LocationID INT,
      CategoryID INT,
      TaskTitle VARCHAR(500) NOT NULL,
      TaskDescription LONGTEXT,
      AssignedToEmployeeID INT,
      AssignedByID INT NOT NULL,
      Priority VARCHAR(500) DEFAULT 'Medium',
      RecurrencePattern VARCHAR(500) NOT NULL,
      \`Interval\` INT DEFAULT 1,
      DaysOfWeek VARCHAR(500),
      DayOfMonth INT,
      EstimatedHours DECIMAL(10,2) DEFAULT 0.0,
      StartDate VARCHAR(20) NOT NULL,
      EndDate VARCHAR(20),
      LastGeneratedDate VARCHAR(20),
      NextDueDate VARCHAR(20) NOT NULL,
      IsActive TINYINT DEFAULT 1,
      ChecklistJSON LONGTEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS NotificationLog (
      LogID INT PRIMARY KEY AUTO_INCREMENT,
      NotificationID INT,
      UserID INT NOT NULL,
      Channel VARCHAR(100) DEFAULT 'InApp',
      \`Status\` VARCHAR(50) DEFAULT 'Sent',
      SentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      ErrorMessage LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Seed data if tables are empty
  const [userRows] = await mysqlPool!.execute('SELECT COUNT(*) as cnt FROM Users');
  const userCount = (userRows as any[])[0].cnt;

  if (userCount === 0) {
    console.log('[Database] Seeding MySQL database with demo data...');

    // Roles
    await runSql(`INSERT INTO Roles (RoleID, RoleName, Description, IsSystemRole) VALUES
      (1, 'Super Admin', 'Full system access with all permissions', 1),
      (2, 'Finance Admin', 'Financial operations and reporting access', 1),
      (3, 'Management', 'Strategic oversight and approval authority', 1),
      (4, 'Manager', 'Department management and task oversight', 1),
      (5, 'Employee', 'Standard task execution and date management', 1),
      (6, 'Viewer', 'Read-only access across assigned modules', 1)
    `);

    // Permissions
    await runSql(`INSERT INTO Permissions (PermissionCode, PermissionName, Module, Description) VALUES
      ('TASK_VIEW', 'View Tasks', 'Tasks', 'View task list and details'),
      ('TASK_CREATE', 'Create Tasks', 'Tasks', 'Create new tasks'),
      ('TASK_EDIT', 'Edit Tasks', 'Tasks', 'Edit existing tasks'),
      ('TASK_DELETE', 'Delete Tasks', 'Tasks', 'Delete tasks'),
      ('TASK_APPROVE', 'Approve Tasks', 'Tasks', 'Approve submitted tasks'),
      ('TASK_ASSIGN', 'Assign Tasks', 'Tasks', 'Assign tasks to employees'),
      ('DATE_VIEW', 'View Important Dates', 'Dates', 'View important dates'),
      ('DATE_CREATE', 'Create Important Dates', 'Dates', 'Create new important dates'),
      ('DATE_EDIT', 'Edit Important Dates', 'Dates', 'Edit existing important dates'),
      ('DATE_DELETE', 'Delete Important Dates', 'Dates', 'Delete important dates'),
      ('DATE_RENEW', 'Renew Important Dates', 'Dates', 'Renew expiring items'),
      ('REPORT_VIEW', 'View Reports', 'Reports', 'View reports and analytics'),
      ('REPORT_EXPORT', 'Export Reports', 'Reports', 'Export reports to file'),
      ('USER_MANAGE', 'Manage Users', 'Admin', 'Create, edit, delete users'),
      ('ROLE_MANAGE', 'Manage Roles', 'Admin', 'Manage roles and permissions'),
      ('COMPANY_MANAGE', 'Manage Companies', 'Admin', 'Manage company settings'),
      ('AUDIT_VIEW', 'View Audit Logs', 'Admin', 'View system audit trail'),
      ('SETTINGS_MANAGE', 'Manage Settings', 'Admin', 'Configure system settings'),
      ('MASTER_MANAGE', 'Manage Masters', 'Admin', 'Manage master data'),
      ('CALENDAR_VIEW', 'View Calendar', 'Calendar', 'View calendar and events'),
      ('NOTIFICATION_MANAGE', 'Manage Notifications', 'Admin', 'Manage notification settings'),
      ('DEPARTMENT_MANAGE', 'Manage Departments', 'Admin', 'Manage departments'),
      ('EMPLOYEE_MANAGE', 'Manage Employees', 'Admin', 'Manage employee records'),
      ('LOCATION_MANAGE', 'Manage Locations', 'Admin', 'Manage company locations')
    `);

    // RolePermissions — Super Admin gets all
    const [permRows] = await mysqlPool!.execute('SELECT PermissionID FROM Permissions');
    for (const p of (permRows as any[])) {
      await mysqlPool!.execute('INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (1, ?)', [p.PermissionID]);
    }
    // Finance Admin
    const financePerms = ['TASK_VIEW','TASK_CREATE','TASK_EDIT','DATE_VIEW','DATE_CREATE','DATE_EDIT','DATE_RENEW','REPORT_VIEW','REPORT_EXPORT','CALENDAR_VIEW'];
    for (const code of financePerms) {
      await mysqlPool!.execute('INSERT INTO RolePermissions (RoleID, PermissionID) SELECT 2, PermissionID FROM Permissions WHERE PermissionCode = ?', [code]);
    }
    // Management
    const mgmtPerms = ['TASK_VIEW','TASK_APPROVE','DATE_VIEW','DATE_CREATE','DATE_EDIT','DATE_RENEW','REPORT_VIEW','REPORT_EXPORT','AUDIT_VIEW','CALENDAR_VIEW'];
    for (const code of mgmtPerms) {
      await mysqlPool!.execute('INSERT INTO RolePermissions (RoleID, PermissionID) SELECT 3, PermissionID FROM Permissions WHERE PermissionCode = ?', [code]);
    }
    // Manager
    const mgrPerms = ['TASK_VIEW','TASK_CREATE','TASK_EDIT','TASK_APPROVE','TASK_ASSIGN','DATE_VIEW','DATE_CREATE','DATE_EDIT','DATE_RENEW','REPORT_VIEW','CALENDAR_VIEW'];
    for (const code of mgrPerms) {
      await mysqlPool!.execute('INSERT INTO RolePermissions (RoleID, PermissionID) SELECT 4, PermissionID FROM Permissions WHERE PermissionCode = ?', [code]);
    }
    // Employee
    const empPerms = ['TASK_VIEW','TASK_EDIT','DATE_VIEW','CALENDAR_VIEW'];
    for (const code of empPerms) {
      await mysqlPool!.execute('INSERT INTO RolePermissions (RoleID, PermissionID) SELECT 5, PermissionID FROM Permissions WHERE PermissionCode = ?', [code]);
    }
    // Viewer
    const viewerPerms = ['TASK_VIEW','DATE_VIEW','REPORT_VIEW','CALENDAR_VIEW'];
    for (const code of viewerPerms) {
      await mysqlPool!.execute('INSERT INTO RolePermissions (RoleID, PermissionID) SELECT 6, PermissionID FROM Permissions WHERE PermissionCode = ?', [code]);
    }

    // Locations
    await runSql(`INSERT INTO Locations (LocationID, CompanyID, LocationName, LocationCode, City, State, IsHeadOffice) VALUES
      (1, 1, 'Head Office - Mumbai', 'HO-MUM', 'Mumbai', 'Maharashtra', 1),
      (2, 1, 'Tech Hub - Bangalore', 'TH-BLR', 'Bangalore', 'Karnataka', 0),
      (3, 1, 'Regional Office - Delhi', 'RO-DEL', 'New Delhi', 'Delhi', 0)
    `);

    // Departments
    await runSql(`INSERT INTO Departments (DepartmentID, CompanyID, DepartmentName, DepartmentCode, HOD_EmployeeID) VALUES
      (1, 1, 'Information Technology', 'IT', 1),
      (2, 1, 'Finance & Accounts', 'FIN', 5),
      (3, 1, 'Human Resources', 'HR', 7),
      (4, 1, 'Operations & Procurement', 'OPS', 8),
      (5, 1, 'Admin & Facilities', 'ADM', 6)
    `);

    // Companies
    await runSql(`INSERT INTO Companies (CompanyID, ParentCompanyID, CompanyCode, CompanyName, LegalName, CompanyType, City, State, TenantID) VALUES
      (1, NULL, 'ABC-GRP', 'ABC Group Holdings Ltd', 'ABC Group Holdings Private Limited', 'Holding', 'Mumbai', 'Maharashtra', 1),
      (2, 1, 'ABC-TECH', 'ABC Technologies Pvt Ltd', 'ABC Technologies Private Limited', 'Subsidiary', 'Bangalore', 'Karnataka', 1),
      (3, 1, 'ABC-FIN', 'ABC Financial Services', 'ABC Financial Services Limited', 'Subsidiary', 'Mumbai', 'Maharashtra', 1),
      (4, 2, 'ABC-SOFT', 'ABC Software Solutions', 'ABC Software Solutions Pvt Ltd', 'Branch', 'Hyderabad', 'Telangana', 1),
      (5, 1, 'ABC-MFG', 'ABC Manufacturing Ltd', 'ABC Manufacturing Limited', 'Subsidiary', 'Pune', 'Maharashtra', 1),
      (6, 1, 'ABC-LOG', 'ABC Logistics & Supply Chain', 'ABC Logistics Pvt Ltd', 'Subsidiary', 'Chennai', 'Tamil Nadu', 1),
      (7, 3, 'ABC-INS', 'ABC Insurance Brokers', 'ABC Insurance Broking Services', 'Branch', 'Delhi', 'Delhi', 1),
      (8, 2, 'ABC-CLOUD', 'ABC Cloud Services', 'ABC Cloud Infrastructure Pvt Ltd', 'Branch', 'Bangalore', 'Karnataka', 1),
      (9, 5, 'ABC-AUTO', 'ABC Auto Components', 'ABC Auto Components Manufacturing Ltd', 'Branch', 'Pune', 'Maharashtra', 1)
    `);

    // Employees
    await runSql(`INSERT INTO Employees (EmployeeID, CompanyID, EmployeeCode, FullName, DepartmentID, Designation, LocationID, Phone, Email, JoiningDate, DateOfBirth, AnniversaryDate, Status, TenantID) VALUES
      (1, 1, 'EMP-001', 'Suresh Menon', 1, 'Chief Technology Officer', 1, '+91 98765 11001', 'suresh.menon@apexcorp.com', '2018-04-15', '1985-03-22', '2018-04-15', 'Active', 1),
      (2, 1, 'EMP-002', 'Priya Sharma', 2, 'Chief Financial Officer', 1, '+91 98765 11002', 'priya.sharma@apexcorp.com', '2019-06-01', '1983-08-14', '2019-06-01', 'Active', 1),
      (3, 1, 'EMP-003', 'Amit Patel', 1, 'Senior DevOps & Systems Lead', 2, '+91 98450 11003', 'amit.patel@apexcorp.com', '2020-01-10', '1988-10-05', '2020-01-10', 'Active', 1),
      (4, 1, 'EMP-004', 'Rahul Verma', 1, 'Database & Security Admin', 1, '+91 98201 11004', 'rahul.verma@apexcorp.com', '2021-03-15', '1992-09-02', '2021-03-15', 'Active', 1),
      (5, 1, 'EMP-005', 'Neha Kulkarni', 2, 'Senior Accounts Executive', 1, '+91 98201 11005', 'neha.kulkarni@apexcorp.com', '2021-07-20', '1991-11-25', '2021-07-20', 'Active', 1),
      (6, 1, 'EMP-006', 'Rohan Deshmukh', 5, 'Facilities & Maintenance Lead', 1, '+91 98201 11006', 'rohan.deshmukh@apexcorp.com', '2019-11-01', '1987-12-14', '2019-11-01', 'Active', 1),
      (7, 1, 'EMP-007', 'Sneha Nair', 3, 'HR & Compliance Manager', 2, '+91 98450 11007', 'sneha.nair@apexcorp.com', '2020-08-15', '1990-04-18', '2020-08-15', 'Active', 1),
      (8, 1, 'EMP-008', 'Vikram Malhotra', 4, 'Procurement Manager', 3, '+91 98110 11008', 'vikram.malhotra@apexcorp.com', '2020-02-01', '1986-07-08', '2020-02-01', 'Active', 1),
      (9, 1, 'EMP-009', 'Ananya Sen', 3, 'Talent Acquisition Specialist', 2, '+91 98450 11009', 'ananya.sen@apexcorp.com', '2022-05-10', '1994-02-28', '2022-05-10', 'Active', 1),
      (10, 1, 'EMP-010', 'Karan Mehra', 5, 'Safety & Security Officer', 3, '+91 98110 11010', 'karan.mehra@apexcorp.com', '2022-09-01', '1993-06-17', '2022-09-01', 'Active', 1)
    `);

    // Users — generate a real bcrypt hash for the demo password
    const pwdHash = bcrypt.hashSync('Password@123', 10);
    await mysqlPool!.execute(`INSERT INTO Users (UserID, CompanyID, EmployeeID, Username, Email, PasswordHash, RoleID, Status, TenantID) VALUES
      (1, 1, 1, 'admin@company.com', 'admin@company.com', ?, 1, 'Active', 1),
      (2, 1, 2, 'finance.admin@company.com', 'finance.admin@company.com', ?, 2, 'Active', 1),
      (3, 1, 1, 'management@company.com', 'management@company.com', ?, 3, 'Active', 1),
      (4, 1, 3, 'manager.it@company.com', 'manager.it@company.com', ?, 4, 'Active', 1),
      (5, 1, 4, 'employee.rahul@company.com', 'employee.rahul@company.com', ?, 5, 'Active', 1),
      (6, 1, 5, 'employee.neha@company.com', 'employee.neha@company.com', ?, 5, 'Active', 1),
      (7, 1, 6, 'employee.rohan@company.com', 'employee.rohan@company.com', ?, 5, 'Active', 1),
      (8, 1, 7, 'manager.hr@company.com', 'manager.hr@company.com', ?, 4, 'Active', 1),
      (9, 1, 8, 'manager.purchase@company.com', 'manager.purchase@company.com', ?, 4, 'Active', 1),
      (10, 1, NULL, 'viewer@company.com', 'viewer@company.com', ?, 6, 'Active', 1)
    `, [pwdHash, pwdHash, pwdHash, pwdHash, pwdHash, pwdHash, pwdHash, pwdHash, pwdHash, pwdHash]);

    // UserCompany mappings
    await runSql(`INSERT INTO UserCompany (UserID, CompanyID, RoleID, IsPrimary, AccessScope) VALUES
      (1, 1, 1, 1, 'All'), (1, 2, 1, 0, 'All'), (1, 3, 1, 0, 'All'),
      (2, 1, 2, 1, 'Department'), (3, 1, 3, 1, 'All'),
      (4, 1, 4, 1, 'Department'), (4, 2, 4, 0, 'Department'),
      (5, 1, 5, 1, 'Own'), (6, 1, 5, 1, 'Own'), (7, 1, 5, 1, 'Own'),
      (8, 1, 4, 1, 'Department'), (9, 1, 4, 1, 'Department'),
      (10, 1, 6, 1, 'All')
    `);

    // DateCategories
    await runSql(`INSERT INTO DateCategories (CategoryName, ColorCode, Icon, IsSystem) VALUES
      ('Employee Birthday', '#ec4899', 'Cake', 1),
      ('Employee Work Anniversary', '#f59e0b', 'Award', 1),
      ('Company Anniversary', '#8b5cf6', 'PartyPopper', 1),
      ('Contract Expiry', '#ef4444', 'FileText', 1),
      ('AMC Expiry', '#3b82f6', 'Wrench', 1),
      ('Warranty Expiry', '#06b6d4', 'ShieldAlert', 1),
      ('Insurance Expiry', '#10b981', 'ShieldCheck', 1),
      ('License Renewal', '#6366f1', 'FileCheck', 1),
      ('Registration Renewal', '#84cc16', 'BookmarkCheck', 1),
      ('Agreement Expiry', '#f97316', 'FileSignature', 1),
      ('Lease Expiry', '#a855f7', 'Building2', 1),
      ('Payment Due Date', '#e11d48', 'CreditCard', 1),
      ('Tax Filing Deadline', '#14b8a6', 'Calculator', 1),
      ('Audit Schedule', '#f43f5e', 'ClipboardCheck', 1),
      ('Compliance Due Date', '#0ea5e9', 'Scale', 1)
    `);

    // Default tenant
    await runSql(`INSERT INTO Tenants (TenantID, TenantCode, TenantName, LegalName, ContactPerson, ContactEmail, Industry, City, State, Country, SubscriptionTier, MaxCompanies, MaxUsers, LicenseStartDate, LicenseEndDate, EnabledModules, Status) VALUES
      (1, 'DEFAULT', 'Default Organization', 'Default Organization Pvt Ltd', 'System Admin', 'admin@company.com', 'Technology', 'Mumbai', 'Maharashtra', 'India', 'Enterprise', 100, 1000, '2025-01-01', '2030-12-31', '["tasks","dates","calendar","reports","audit"]', 'Active')
    `);

    // Platform Admin role
    await runSql(`INSERT INTO Roles (RoleName, Description, IsSystemRole, IsPlatformRole) VALUES ('Platform Admin', 'Full platform access across all tenants and companies', 1, 1)`);

    // Grant all permissions to Platform Admin
    const [platRole] = await mysqlPool!.execute("SELECT RoleID FROM Roles WHERE RoleName = 'Platform Admin' LIMIT 1");
    const platformRoleId = (platRole as any[])[0]?.RoleID || 7;
    const [allPerms] = await mysqlPool!.execute('SELECT PermissionID FROM Permissions');
    for (const p of (allPerms as any[])) {
      try {
        await mysqlPool!.execute('INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (?, ?)', [platformRoleId, p.PermissionID]);
      } catch {}
    }

    // Platform super admin user
    const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'PlatformAdmin@2026!';
    const platformPwdHash = bcrypt.hashSync(platformPassword, 12);
    await mysqlPool!.execute(`INSERT INTO Users (CompanyID, EmployeeID, Username, Email, PasswordHash, RoleID, Status, TenantID, IsPlatformAdmin, MustChangePassword) VALUES (1, NULL, 'sverpadmin', 'platform@erp-system.com', ?, ?, 'Active', NULL, 1, 1)`, [platformPwdHash, platformRoleId]);

    console.log('[Database] MySQL seed completed successfully.');
  }
}

/**
 * Initializes SQLite tables & demo seeds matching SQL Server DDL
 */
async function initSqliteSchemaAndSeed() {
  if (!sqliteDb) return;

  const runSql = (sqlText: string) => {
    return new Promise<void>((resolve, reject) => {
      sqliteDb!.run(sqlText, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  await runSql(`
    CREATE TABLE IF NOT EXISTS Companies (
      CompanyID INTEGER PRIMARY KEY AUTOINCREMENT,
      ParentCompanyID INTEGER,
      CompanyCode TEXT UNIQUE,
      CompanyName TEXT NOT NULL,
      LegalName TEXT,
      CompanyType TEXT DEFAULT 'Subsidiary',
      ShortName TEXT,
      Address TEXT,
      City TEXT,
      State TEXT,
      Country TEXT DEFAULT 'India',
      PINCode TEXT,
      Phone TEXT,
      Email TEXT,
      Website TEXT,
      GSTIN TEXT,
      PAN TEXT,
      Logo TEXT,
      EnabledModules TEXT DEFAULT '["tasks","dates","calendar","reports","audit"]',
      SubscriptionTier TEXT DEFAULT 'Enterprise',
      MaxUsers INTEGER DEFAULT 100,
      FinancialYear TEXT DEFAULT '2026-2027',
      TimeZone TEXT DEFAULT 'Asia/Kolkata',
      DefaultReminderSettings TEXT,
      Status TEXT DEFAULT 'Active',
      IsDeleted INTEGER DEFAULT 0,
      CreatedBy INTEGER,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedBy INTEGER,
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS UserCompany (
      UserCompanyID INTEGER PRIMARY KEY AUTOINCREMENT,
      UserID INTEGER NOT NULL,
      CompanyID INTEGER NOT NULL,
      RoleID INTEGER NOT NULL,
      AccessScope TEXT DEFAULT 'Own',
      IsPrimary INTEGER DEFAULT 0,
      IsActive INTEGER DEFAULT 1,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now')),
      UNIQUE(UserID, CompanyID)
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Locations (
      LocationID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      LocationCode TEXT NOT NULL,
      LocationName TEXT NOT NULL,
      Address TEXT,
      City TEXT,
      State TEXT,
      ContactPerson TEXT,
      Phone TEXT,
      Email TEXT,
      Status TEXT DEFAULT 'Active',
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Departments (
      DepartmentID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      DepartmentCode TEXT NOT NULL,
      DepartmentName TEXT NOT NULL,
      DepartmentHeadID INTEGER,
      Status TEXT DEFAULT 'Active',
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Roles (
      RoleID INTEGER PRIMARY KEY AUTOINCREMENT,
      RoleName TEXT NOT NULL UNIQUE,
      Description TEXT,
      IsSystemRole INTEGER DEFAULT 1,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Permissions (
      PermissionID INTEGER PRIMARY KEY AUTOINCREMENT,
      PermissionCode TEXT NOT NULL UNIQUE,
      ModuleName TEXT NOT NULL,
      Description TEXT
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS RolePermissions (
      RoleID INTEGER NOT NULL,
      PermissionID INTEGER NOT NULL,
      PRIMARY KEY (RoleID, PermissionID)
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Employees (
      EmployeeID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      EmployeeCode TEXT NOT NULL,
      EmployeeName TEXT NOT NULL,
      DepartmentID INTEGER,
      Designation TEXT,
      LocationID INTEGER,
      Mobile TEXT,
      Email TEXT NOT NULL,
      JoiningDate TEXT,
      Birthday TEXT,
      WorkAnniversary TEXT,
      ManagerID INTEGER,
      ProfilePhoto TEXT,
      Status TEXT DEFAULT 'Active',
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Users (
      UserID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      EmployeeID INTEGER,
      Username TEXT NOT NULL UNIQUE,
      Email TEXT NOT NULL UNIQUE,
      PasswordHash TEXT NOT NULL,
      RoleID INTEGER NOT NULL,
      Status TEXT DEFAULT 'Active',
      LastLoginAt TEXT,
      FailedLoginAttempts INTEGER DEFAULT 0,
      LockoutUntil TEXT,
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDateCategories (
      CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER,
      CategoryName TEXT NOT NULL,
      ColorCode TEXT DEFAULT '#3b82f6',
      IconName TEXT DEFAULT 'Calendar',
      IsSystemDefault INTEGER DEFAULT 0,
      Status TEXT DEFAULT 'Active',
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDates (
      ImportantDateID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      LocationID INTEGER,
      DepartmentID INTEGER,
      CategoryID INTEGER NOT NULL,
      Title TEXT NOT NULL,
      Description TEXT,
      RelatedEmployeeID INTEGER,
      RelatedVendor TEXT,
      RelatedCustomer TEXT,
      ReferenceNumber TEXT,
      Date TEXT NOT NULL,
      StartDate TEXT,
      ExpiryDate TEXT,
      RecurrenceType TEXT DEFAULT 'Does Not Repeat',
      ResponsibleEmployeeID INTEGER,
      Priority TEXT DEFAULT 'Medium',
      Attachment TEXT,
      Notes TEXT,
      AutoGenerateTask INTEGER DEFAULT 0,
      LeadDaysForTask INTEGER DEFAULT 15,
      TaskAssignedToID INTEGER,
      GeneratedTaskID INTEGER,
      Status TEXT DEFAULT 'Active',
      IsDeleted INTEGER DEFAULT 0,
      CreatedBy INTEGER,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedBy INTEGER,
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDateReminders (
      ReminderID INTEGER PRIMARY KEY AUTOINCREMENT,
      ImportantDateID INTEGER NOT NULL,
      DaysBefore INTEGER NOT NULL,
      ReminderChannel TEXT DEFAULT 'In-App',
      IsCustomDate INTEGER DEFAULT 0,
      CustomDate TEXT,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ImportantDateHistory (
      HistoryID INTEGER PRIMARY KEY AUTOINCREMENT,
      ImportantDateID INTEGER NOT NULL,
      PreviousExpiryDate TEXT NOT NULL,
      NewExpiryDate TEXT NOT NULL,
      RenewedDate TEXT NOT NULL,
      RenewedByUserID INTEGER,
      Remarks TEXT,
      AttachmentURL TEXT,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskCategories (
      CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER,
      CategoryName TEXT NOT NULL,
      ColorCode TEXT DEFAULT '#10b981',
      RequiresApproval INTEGER DEFAULT 0,
      Status TEXT DEFAULT 'Active',
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Tasks (
      TaskID INTEGER PRIMARY KEY AUTOINCREMENT,
      TaskNumber TEXT NOT NULL UNIQUE,
      CompanyID INTEGER NOT NULL,
      LocationID INTEGER,
      DepartmentID INTEGER,
      CategoryID INTEGER,
      TaskTitle TEXT NOT NULL,
      TaskDescription TEXT,
      AssignedByID INTEGER NOT NULL,
      ManagerID INTEGER,
      StartDate TEXT,
      DueDate TEXT NOT NULL,
      Priority TEXT DEFAULT 'Medium',
      Status TEXT DEFAULT 'New',
      PercentageComplete INTEGER DEFAULT 0,
      EstimatedHours REAL DEFAULT 0.0,
      ActualHours REAL DEFAULT 0.0,
      ParentTaskID INTEGER,
      RelatedImportantDateID INTEGER,
      RelatedEmployeeID INTEGER,
      RelatedVendor TEXT,
      RelatedCustomer TEXT,
      Tags TEXT,
      CompletedDate TEXT,
      ApprovedByID INTEGER,
      ApprovedDate TEXT,
      RejectionReason TEXT,
      IsDeleted INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskAssignees (
      TaskID INTEGER NOT NULL,
      EmployeeID INTEGER NOT NULL,
      AssignedAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (TaskID, EmployeeID)
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskChecklist (
      ChecklistItemID INTEGER PRIMARY KEY AUTOINCREMENT,
      TaskID INTEGER NOT NULL,
      Title TEXT NOT NULL,
      IsCompleted INTEGER DEFAULT 0,
      CompletedAt TEXT,
      CompletedByEmployeeID INTEGER,
      SortOrder INTEGER DEFAULT 0,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskUpdates (
      UpdateID INTEGER PRIMARY KEY AUTOINCREMENT,
      TaskID INTEGER NOT NULL,
      EmployeeID INTEGER,
      PreviousStatus TEXT,
      NewStatus TEXT,
      PreviousProgress INTEGER,
      NewProgress INTEGER,
      TimeSpentHours REAL DEFAULT 0.0,
      Remarks TEXT NOT NULL,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskComments (
      CommentID INTEGER PRIMARY KEY AUTOINCREMENT,
      TaskID INTEGER NOT NULL,
      UserID INTEGER NOT NULL,
      CommentText TEXT NOT NULL,
      MentionedUserIDs TEXT,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskAttachments (
      AttachmentID INTEGER PRIMARY KEY AUTOINCREMENT,
      TaskID INTEGER,
      ImportantDateID INTEGER,
      CommentID INTEGER,
      FileName TEXT NOT NULL,
      OriginalName TEXT NOT NULL,
      FileType TEXT NOT NULL,
      FileSize INTEGER NOT NULL,
      StoragePath TEXT NOT NULL,
      UploadedByUserID INTEGER NOT NULL,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskActivityLog (
      ActivityID INTEGER PRIMARY KEY AUTOINCREMENT,
      TaskID INTEGER NOT NULL,
      UserID INTEGER NOT NULL,
      ActionType TEXT NOT NULL,
      FieldName TEXT,
      OldValue TEXT,
      NewValue TEXT,
      Description TEXT,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TaskTemplates (
      TemplateID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      DepartmentID INTEGER,
      CategoryID INTEGER,
      TemplateName TEXT NOT NULL,
      Description TEXT,
      EstimatedHours REAL DEFAULT 0.0,
      Priority TEXT DEFAULT 'Medium',
      ChecklistJSON TEXT,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS RecurringTasks (
      RecurringTaskID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      DepartmentID INTEGER,
      LocationID INTEGER,
      CategoryID INTEGER,
      TaskTitle TEXT NOT NULL,
      TaskDescription TEXT,
      AssignedToEmployeeID INTEGER,
      AssignedByID INTEGER NOT NULL,
      Priority TEXT DEFAULT 'Medium',
      RecurrencePattern TEXT NOT NULL,
      Interval INTEGER DEFAULT 1,
      DaysOfWeek TEXT,
      DayOfMonth INTEGER,
      EstimatedHours REAL DEFAULT 0.0,
      StartDate TEXT NOT NULL,
      EndDate TEXT,
      LastGeneratedDate TEXT,
      NextDueDate TEXT NOT NULL,
      IsActive INTEGER DEFAULT 1,
      ChecklistJSON TEXT,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS ReminderRules (
      RuleID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      RuleName TEXT NOT NULL,
      TargetType TEXT NOT NULL,
      DaysOffset INTEGER NOT NULL,
      Channel TEXT DEFAULT 'In-App',
      IsActive INTEGER DEFAULT 1,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS EscalationRules (
      EscalationID INTEGER PRIMARY KEY AUTOINCREMENT,
      CompanyID INTEGER NOT NULL,
      DaysOverdue INTEGER NOT NULL,
      EscalateToRole TEXT NOT NULL,
      Channel TEXT DEFAULT 'In-App',
      IsActive INTEGER DEFAULT 1,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Notifications (
      NotificationID INTEGER PRIMARY KEY AUTOINCREMENT,
      UserID INTEGER NOT NULL,
      Title TEXT NOT NULL,
      Message TEXT NOT NULL,
      Type TEXT NOT NULL,
      ReferenceType TEXT,
      ReferenceID INTEGER,
      IsRead INTEGER DEFAULT 0,
      ReadAt TEXT,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS NotificationLog (
      LogID INTEGER PRIMARY KEY AUTOINCREMENT,
      IdempotencyKey TEXT NOT NULL UNIQUE,
      NotificationType TEXT NOT NULL,
      RecipientUserID INTEGER NOT NULL,
      Channel TEXT NOT NULL,
      SentAt TEXT DEFAULT (datetime('now')),
      Status TEXT DEFAULT 'Sent'
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS AuditLogs (
      AuditID INTEGER PRIMARY KEY AUTOINCREMENT,
      UserID INTEGER,
      Username TEXT,
      Action TEXT NOT NULL,
      EntityName TEXT NOT NULL,
      EntityID INTEGER,
      OldValues TEXT,
      NewValues TEXT,
      IPAddress TEXT,
      UserAgent TEXT,
      CreatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS Tenants (
      TenantID INTEGER PRIMARY KEY AUTOINCREMENT,
      TenantCode TEXT UNIQUE NOT NULL,
      TenantName TEXT NOT NULL,
      LegalName TEXT,
      ContactPerson TEXT,
      ContactEmail TEXT NOT NULL,
      ContactMobile TEXT,
      Industry TEXT,
      Address TEXT,
      City TEXT,
      State TEXT,
      Country TEXT DEFAULT 'India',
      PINCode TEXT,
      Website TEXT,
      GSTIN TEXT,
      PAN TEXT,
      Logo TEXT,
      SubscriptionTier TEXT DEFAULT 'Standard',
      MaxCompanies INTEGER DEFAULT 5,
      MaxUsers INTEGER DEFAULT 50,
      LicenseStartDate TEXT,
      LicenseEndDate TEXT,
      EnabledModules TEXT DEFAULT '["tasks","dates","calendar","reports","audit"]',
      Status TEXT DEFAULT 'Pending',
      IsDeleted INTEGER DEFAULT 0,
      CreatedBy INTEGER,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedBy INTEGER,
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  await runSql(`
    CREATE TABLE IF NOT EXISTS TenantRegistrations (
      RegistrationID INTEGER PRIMARY KEY AUTOINCREMENT,
      TenantID INTEGER,
      RegistrationToken TEXT UNIQUE NOT NULL,
      TokenExpiresAt TEXT NOT NULL,
      CompanyName TEXT NOT NULL,
      LegalName TEXT,
      ContactPerson TEXT NOT NULL,
      ContactEmail TEXT NOT NULL,
      ContactMobile TEXT,
      Address TEXT,
      City TEXT,
      State TEXT,
      Country TEXT DEFAULT 'India',
      PINCode TEXT,
      GSTIN TEXT,
      PAN TEXT,
      Website TEXT,
      Industry TEXT,
      CompanyType TEXT DEFAULT 'Subsidiary',
      NumBranches INTEGER DEFAULT 1,
      NumUsers INTEGER DEFAULT 10,
      RequestedModules TEXT,
      AdminName TEXT,
      AdminEmail TEXT,
      AdminUsername TEXT,
      PasswordHash TEXT,
      Status TEXT DEFAULT 'Pending',
      RejectionReason TEXT,
      ReviewedBy INTEGER,
      ReviewedAt TEXT,
      Notes TEXT,
      CreatedAt TEXT DEFAULT (datetime('now')),
      UpdatedAt TEXT DEFAULT (datetime('now'))
    );
  `);

  // Run column migrations for SQLite
  const tryAddCol = async (table: string, colDef: string) => {
    try {
      await runSql(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
    } catch {}
  };
  await tryAddCol('Companies', 'ParentCompanyID INTEGER');
  await tryAddCol('Companies', 'CompanyCode TEXT');
  await tryAddCol('Companies', 'LegalName TEXT');
  await tryAddCol('Companies', 'CompanyType TEXT DEFAULT "Subsidiary"');
  await tryAddCol('Companies', 'EnabledModules TEXT DEFAULT \'["tasks","dates","calendar","reports","audit"]\'');
  await tryAddCol('Companies', 'SubscriptionTier TEXT DEFAULT "Enterprise"');
  await tryAddCol('Companies', 'MaxUsers INTEGER DEFAULT 100');
  await tryAddCol('AuditLogs', 'CompanyID INTEGER');

  // Multi-tenant column migrations
  await tryAddCol('Companies', 'TenantID INTEGER');
  await tryAddCol('Users', 'TenantID INTEGER');
  await tryAddCol('Users', 'IsPlatformAdmin INTEGER DEFAULT 0');
  await tryAddCol('Users', 'MustChangePassword INTEGER DEFAULT 0');
  await tryAddCol('Roles', 'TenantID INTEGER');
  await tryAddCol('Roles', 'IsPlatformRole INTEGER DEFAULT 0');
  await tryAddCol('Employees', 'TenantID INTEGER');
  await tryAddCol('AuditLogs', 'TenantID INTEGER');

  const checkUserComp = await new Promise<any[]>((res) => {
    sqliteDb!.all(`SELECT * FROM UserCompany LIMIT 1`, (err: any, rows: any) => res(rows || []));
  });

  if (checkUserComp.length === 0) {
    console.log('[Database] Seeding multi-tenant company hierarchy into SQLite...');

    // Clean & Seed Multi-Company Hierarchy
    await runSql(`DELETE FROM Companies;`);
    await runSql(`
      INSERT INTO Companies (CompanyID, ParentCompanyID, CompanyCode, CompanyName, LegalName, CompanyType, ShortName, City, State, Status, EnabledModules, SubscriptionTier, MaxUsers)
      VALUES 
      (1, NULL, 'ABC-GRP', 'ABC Group Holdings Ltd', 'ABC Group Holdings International Pvt Ltd', 'Holding', 'ABCGroup', 'Mumbai', 'Maharashtra', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Enterprise', 500),
      (2, 1, 'ABC-HTL', 'ABC Hotels & Resorts Pvt Ltd', 'ABC Hospitality Group India Ltd', 'Subsidiary', 'ABCHotels', 'Dehradun', 'Uttarakhand', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Enterprise', 200),
      (3, 2, 'HTL-DDN', 'ABC Hotel — Dehradun Mall Road', 'ABC Hotel Dehradun Unit', 'Branch', 'HotelDDN', 'Dehradun', 'Uttarakhand', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Professional', 50),
      (4, 2, 'HTL-RSH', 'ABC Hotel & Spa — Rishikesh Ganga', 'ABC Hotel Rishikesh Unit', 'Branch', 'HotelRSH', 'Rishikesh', 'Uttarakhand', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Professional', 50),
      (5, 1, 'ABC-RTL', 'ABC Retail Ventures Pvt Ltd', 'ABC Consumer Retail India Pvt Ltd', 'Subsidiary', 'ABCRetail', 'New Delhi', 'Delhi', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Enterprise', 200),
      (6, 5, 'RTL-DEL', 'ABC Store — Connaught Place Delhi', 'ABC Retail Delhi Store #1', 'Branch', 'StoreDEL', 'New Delhi', 'Delhi', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Standard', 30),
      (7, 5, 'RTL-NOI', 'ABC Store — Sector 18 Noida', 'ABC Retail Noida Store #2', 'Branch', 'StoreNOI', 'Noida', 'Uttar Pradesh', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Standard', 30),
      (8, NULL, 'ZEN-GRP', 'Zenith Enterprises Global Ltd', 'Zenith Multi-Enterprise Corp', 'Holding', 'ZenithCorp', 'Bengaluru', 'Karnataka', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Enterprise', 500),
      (9, 8, 'ZEN-MUM', 'Zenith Cloud Tech Mumbai', 'Zenith Cloud Technologies Mumbai Ltd', 'Subsidiary', 'ZenithMUM', 'Mumbai', 'Maharashtra', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Professional', 100),
      (10, 8, 'ZEN-BLR', 'Zenith Cloud Tech Bengaluru', 'Zenith Cloud Technologies Bengaluru Ltd', 'Subsidiary', 'ZenithBLR', 'Bengaluru', 'Karnataka', 'Active', '["tasks","dates","calendar","reports","audit"]', 'Professional', 100);
    `);

    // Ensure Roles exist
    await runSql(`DELETE FROM Roles;`);
    await runSql(`
      INSERT INTO Roles (RoleID, RoleName, Description, IsSystemRole)
      VALUES 
      (1, 'Super Admin', 'Full SaaS enterprise platform access across all companies', 1),
      (2, 'Group Admin', 'Manages holding company and all recursive subsidiaries & branches', 1),
      (3, 'Company Head', 'Manages single subsidiary company and its branch locations', 1),
      (4, 'Department Manager', 'Creates, assigns, and approves department tasks', 1),
      (5, 'Employee', 'Updates assigned tasks, uploads remarks and checklists', 1),
      (6, 'Viewer', 'Read-only access to dashboards, tasks, and calendar', 1);
    `);

    // Seed UserCompany mappings
    await runSql(`DELETE FROM UserCompany;`);
    await runSql(`
      INSERT INTO UserCompany (UserID, CompanyID, RoleID, AccessScope, IsPrimary, IsActive)
      VALUES
      (1, 1, 1, 'Global', 1, 1),
      (1, 2, 1, 'Global', 0, 1),
      (1, 3, 1, 'Global', 0, 1),
      (1, 4, 1, 'Global', 0, 1),
      (1, 5, 1, 'Global', 0, 1),
      (1, 6, 1, 'Global', 0, 1),
      (1, 7, 1, 'Global', 0, 1),
      (1, 8, 1, 'Global', 0, 1),
      (1, 9, 1, 'Global', 0, 1),
      (1, 10, 1, 'Global', 0, 1),
      (2, 1, 2, 'Hierarchy', 1, 1),
      (3, 1, 2, 'Hierarchy', 1, 1),
      (4, 1, 4, 'Hierarchy', 1, 1),
      (5, 3, 5, 'Own', 1, 1),
      (6, 6, 5, 'Own', 1, 1),
      (7, 3, 5, 'Own', 1, 1),
      (8, 2, 4, 'Hierarchy', 1, 1),
      (9, 5, 4, 'Hierarchy', 1, 1),
      (10, 1, 6, 'Own', 1, 1);
    `);

    await runSql(`DELETE FROM Locations;`);
    await runSql(`DELETE FROM Departments;`);
    await runSql(`DELETE FROM Employees;`);
    await runSql(`DELETE FROM Users;`);
    await runSql(`DELETE FROM ImportantDates;`);
    await runSql(`DELETE FROM Tasks;`);
    await runSql(`DELETE FROM TaskAssignees;`);
    await runSql(`DELETE FROM TaskChecklist;`);
    await runSql(`DELETE FROM TaskTemplates;`);
    await runSql(`DELETE FROM ReminderRules;`);
    await runSql(`DELETE FROM EscalationRules;`);
    await runSql(`DELETE FROM ImportantDateCategories;`);
    await runSql(`DELETE FROM TaskCategories;`);
    await runSql(`DELETE FROM RolePermissions;`);

    await runSql(`
      INSERT INTO Locations (LocationID, CompanyID, LocationCode, LocationName, Address, City, State, ContactPerson, Phone, Email, Status)
      VALUES 
      (1, 1, 'LOC-MUM', 'Headquarters - Mumbai', 'Cyber One, BKC', 'Mumbai', 'Maharashtra', 'Rajesh Sharma', '+91 98200 11223', 'mumbai@apexcorp.com', 'Active'),
      (2, 1, 'LOC-BLR', 'Tech Hub - Bangalore', 'Outer Ring Road, Bellandur', 'Bangalore', 'Karnataka', 'Vikram Rao', '+91 98450 22334', 'bangalore@apexcorp.com', 'Active'),
      (3, 1, 'LOC-DEL', 'Regional Office - Delhi', 'Connaught Place', 'New Delhi', 'Delhi', 'Ananya Gupta', '+91 98110 33445', 'delhi@apexcorp.com', 'Active');
    `);

    await runSql(`
      INSERT INTO Departments (DepartmentID, CompanyID, DepartmentCode, DepartmentName, Status)
      VALUES 
      (1, 1, 'DEPT-IT', 'Information Technology', 'Active'),
      (2, 1, 'DEPT-ACC', 'Accounts & Finance', 'Active'),
      (3, 1, 'DEPT-HR', 'Human Resources', 'Active'),
      (4, 1, 'DEPT-PUR', 'Purchase & Procurement', 'Active'),
      (5, 1, 'DEPT-OPS', 'Operations & Maintenance', 'Active');
    `);

    await runSql(`
      INSERT INTO Roles (RoleID, RoleName, Description, IsSystemRole)
      VALUES 
      (1, 'Super Admin', 'Full enterprise system access with administrative rights', 1),
      (2, 'Company Admin', 'Manages company settings, masters, tasks, and reports', 1),
      (3, 'Management', 'Reviews all tasks, dashboard analytics, and approvals', 1),
      (4, 'Department Manager', 'Creates, assigns, and approves department tasks', 1),
      (5, 'Employee', 'Updates assigned tasks, uploads remarks and checklists', 1),
      (6, 'Viewer', 'Read-only access to dashboards, tasks, and calendar', 1);
    `);

    await runSql(`
      INSERT INTO Permissions (PermissionID, PermissionCode, ModuleName, Description)
      VALUES
      (1, 'tasks.view', 'Tasks', 'View tasks list and details'),
      (2, 'tasks.create', 'Tasks', 'Create new tasks'),
      (3, 'tasks.edit', 'Tasks', 'Edit task details'),
      (4, 'tasks.delete', 'Tasks', 'Delete or archive tasks'),
      (5, 'tasks.assign', 'Tasks', 'Assign tasks to employees'),
      (6, 'tasks.update_progress', 'Tasks', 'Update task progress and remarks'),
      (7, 'tasks.approve', 'Tasks', 'Approve or reject completed tasks'),
      (8, 'tasks.bulk_actions', 'Tasks', 'Perform bulk task operations'),
      (9, 'dates.view', 'Important Dates', 'View important dates and calendars'),
      (10, 'dates.create', 'Important Dates', 'Create important dates'),
      (11, 'dates.edit', 'Important Dates', 'Edit and update important dates'),
      (12, 'dates.renew', 'Important Dates', 'Renew expiring dates'),
      (13, 'dates.delete', 'Important Dates', 'Delete important dates'),
      (14, 'masters.manage', 'Masters', 'Manage companies, departments, locations, employees'),
      (15, 'roles.manage', 'Security', 'Manage roles and permissions'),
      (16, 'reports.view', 'Reports', 'View task and date reports'),
      (17, 'reports.export', 'Reports', 'Export reports to Excel and PDF'),
      (18, 'audit.view', 'Audit', 'View system audit history'),
      (19, 'settings.manage', 'Settings', 'Manage system rules and integrations');
    `);

    for (let p = 1; p <= 19; p++) {
      await runSql(`INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (1, ${p}), (2, ${p});`);
    }
    for (const p of [1, 2, 3, 5, 6, 7, 9, 10, 11, 12, 16, 17]) {
      await runSql(`INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (4, ${p});`);
    }
    for (const p of [1, 5, 7, 9, 16, 17]) {
      await runSql(`INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (3, ${p});`);
    }
    for (const p of [1, 6, 9]) {
      await runSql(`INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (5, ${p});`);
    }
    for (const p of [1, 9, 16]) {
      await runSql(`INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (6, ${p});`);
    }

    // 10 Employees
    await runSql(`
      INSERT INTO Employees (EmployeeID, CompanyID, EmployeeCode, EmployeeName, DepartmentID, Designation, LocationID, Mobile, Email, JoiningDate, Birthday, WorkAnniversary, Status)
      VALUES
      (1, 1, 'EMP-001', 'Suresh Menon', 1, 'Director & Head of IT', 1, '+91 98201 11001', 'suresh.menon@apexcorp.com', '2018-04-15', '1982-08-30', '2018-04-15', 'Active'),
      (2, 1, 'EMP-002', 'Pooja Sharma', 2, 'Finance Controller', 1, '+91 98201 11002', 'pooja.sharma@apexcorp.com', '2019-06-01', '1985-09-12', '2019-06-01', 'Active'),
      (3, 1, 'EMP-003', 'Amit Patel', 1, 'Senior DevOps & Systems Lead', 2, '+91 98450 11003', 'amit.patel@apexcorp.com', '2020-01-10', '1988-10-05', '2020-01-10', 'Active'),
      (4, 1, 'EMP-004', 'Rahul Verma', 1, 'Database & Security Admin', 1, '+91 98201 11004', 'rahul.verma@apexcorp.com', '2021-03-15', '1992-09-02', '2021-03-15', 'Active'),
      (5, 1, 'EMP-005', 'Neha Kulkarni', 2, 'Senior Accounts Executive', 1, '+91 98201 11005', 'neha.kulkarni@apexcorp.com', '2021-07-20', '1991-11-25', '2021-07-20', 'Active'),
      (6, 1, 'EMP-006', 'Rohan Deshmukh', 5, 'Facilities & Maintenance Lead', 1, '+91 98201 11006', 'rohan.deshmukh@apexcorp.com', '2019-11-01', '1987-12-14', '2019-11-01', 'Active'),
      (7, 1, 'EMP-007', 'Sneha Nair', 3, 'HR & Compliance Manager', 2, '+91 98450 11007', 'sneha.nair@apexcorp.com', '2020-08-15', '1990-04-18', '2020-08-15', 'Active'),
      (8, 1, 'EMP-008', 'Vikram Malhotra', 4, 'Procurement Manager', 3, '+91 98110 11008', 'vikram.malhotra@apexcorp.com', '2020-02-01', '1986-07-08', '2020-02-01', 'Active'),
      (9, 1, 'EMP-009', 'Ananya Sen', 3, 'Talent Acquisition Specialist', 2, '+91 98450 11009', 'ananya.sen@apexcorp.com', '2022-05-10', '1994-02-28', '2022-05-10', 'Active'),
      (10, 1, 'EMP-010', 'Karan Mehra', 5, 'Safety & Security Officer', 3, '+91 98110 11010', 'karan.mehra@apexcorp.com', '2022-09-01', '1993-06-17', '2022-09-01', 'Active');
    `);

    // Users — generate a real bcrypt hash for the demo password
    const pwdHash = bcrypt.hashSync('Password@123', 10);
    await runSql(`
      INSERT INTO Users (UserID, CompanyID, EmployeeID, Username, Email, PasswordHash, RoleID, Status)
      VALUES
      (1, 1, 1, 'admin@company.com', 'admin@company.com', '${pwdHash}', 1, 'Active'),
      (2, 1, 2, 'finance.admin@company.com', 'finance.admin@company.com', '${pwdHash}', 2, 'Active'),
      (3, 1, 1, 'management@company.com', 'management@company.com', '${pwdHash}', 3, 'Active'),
      (4, 1, 3, 'manager.it@company.com', 'manager.it@company.com', '${pwdHash}', 4, 'Active'),
      (5, 1, 4, 'employee.rahul@company.com', 'employee.rahul@company.com', '${pwdHash}', 5, 'Active'),
      (6, 1, 5, 'employee.neha@company.com', 'employee.neha@company.com', '${pwdHash}', 5, 'Active'),
      (7, 1, 6, 'employee.rohan@company.com', 'employee.rohan@company.com', '${pwdHash}', 5, 'Active'),
      (8, 1, 7, 'manager.hr@company.com', 'manager.hr@company.com', '${pwdHash}', 4, 'Active'),
      (9, 1, 8, 'manager.purchase@company.com', 'manager.purchase@company.com', '${pwdHash}', 4, 'Active'),
      (10, 1, NULL, 'viewer@company.com', 'viewer@company.com', '${pwdHash}', 6, 'Active');
    `);

    const dateCats = [
      ['Employee Birthday', '#ec4899', 'Cake'],
      ['Employee Work Anniversary', '#f59e0b', 'Award'],
      ['Company Anniversary', '#8b5cf6', 'PartyPopper'],
      ['Contract Expiry', '#ef4444', 'FileText'],
      ['AMC Expiry', '#3b82f6', 'Wrench'],
      ['Warranty Expiry', '#06b6d4', 'ShieldAlert'],
      ['Insurance Expiry', '#10b981', 'ShieldCheck'],
      ['License Renewal', '#6366f1', 'FileCheck'],
      ['Registration Renewal', '#84cc16', 'BookmarkCheck'],
      ['Agreement Expiry', '#f97316', 'FileSignature'],
      ['Lease Expiry', '#a855f7', 'Building2'],
      ['Payment Due Date', '#e11d48', 'CreditCard'],
      ['Vendor Follow-up', '#0284c7', 'PhoneCall'],
      ['Customer Follow-up', '#059669', 'Users'],
      ['Compliance Date', '#dc2626', 'Scale'],
      ['Tax Date', '#d97706', 'Receipt'],
      ['Audit Date', '#7c3aed', 'ClipboardCheck'],
      ['Maintenance Date', '#475569', 'Hammer'],
      ['Subscription Renewal', '#2563eb', 'RefreshCw'],
      ['Domain Renewal', '#0891b2', 'Globe'],
      ['Software License Renewal', '#4f46e5', 'Key'],
      ['Custom Event', '#64748b', 'Tag'],
    ];

    for (const [name, color, icon] of dateCats) {
      await runSql(`INSERT INTO ImportantDateCategories (CompanyID, CategoryName, ColorCode, IconName, IsSystemDefault, Status) VALUES (1, '${name}', '${color}', '${icon}', 1, 'Active')`);
    }

    await runSql(`
      INSERT INTO TaskCategories (CategoryID, CompanyID, CategoryName, ColorCode, RequiresApproval, Status)
      VALUES 
      (1, 1, 'Infrastructure & Maintenance', '#3b82f6', 1, 'Active'),
      (2, 1, 'Compliance & Legal', '#ef4444', 1, 'Active'),
      (3, 1, 'Financial & Auditing', '#10b981', 1, 'Active'),
      (4, 1, 'HR & Onboarding', '#f59e0b', 0, 'Active'),
      (5, 1, 'Vendor & Procurement', '#8b5cf6', 1, 'Active'),
      (6, 1, 'Daily Operations', '#64748b', 0, 'Active');
    `);

    await runSql(`
      INSERT INTO ImportantDates (ImportantDateID, CompanyID, LocationID, DepartmentID, CategoryID, Title, Description, RelatedVendor, ReferenceNumber, Date, StartDate, ExpiryDate, RecurrenceType, ResponsibleEmployeeID, Priority, AutoGenerateTask, LeadDaysForTask, TaskAssignedToID, Status, CreatedBy)
      VALUES
      (1, 1, 1, 5, 5, 'CCTV & Security Surveillance AMC Renewal', 'Annual maintenance contract for 128 IP Cameras and Central NVR system at Mumbai HQ.', 'SecureTech Solutions India', 'AMC-SEC-2025-99', '2026-09-08', '2025-09-08', '2026-09-08', 'Yearly', 6, 'Critical', 1, 15, 6, 'Active', 1),
      (2, 1, 1, 2, 7, 'Corporate Fleet & Asset Insurance Renewal', 'Comprehensive commercial insurance covering corporate vehicle fleet and DG sets.', 'HDFC ERGO General Insurance', 'POL-FLEET-88214', '2026-09-15', '2025-09-15', '2026-09-15', 'Yearly', 2, 'High', 1, 30, 2, 'Active', 1),
      (3, 1, 1, 1, 20, 'ApexCorp.com Primary Domain & SSL Renewal', 'DigiCert Wildcard SSL and Cloudflare Enterprise registrar domain renewal.', 'Cloudflare Inc', 'DOM-APEX-2026', '2026-09-04', '2025-09-04', '2026-09-04', 'Yearly', 3, 'Critical', 1, 10, 3, 'Active', 1),
      (4, 1, 1, 2, 16, 'GSTR-3B Monthly Tax Return Filing', 'Monthly filing and tax settlement for GST obligations.', 'GST Portal India', 'GST-MUM-SEP-26', '2026-09-20', '2026-09-01', '2026-09-20', 'Monthly', 2, 'High', 1, 7, 2, 'Active', 1),
      (5, 1, 1, 1, 17, 'ISO 27001 Information Security Surveillance Audit', 'Annual Stage 2 surveillance audit by BSI auditors for ISO/IEC 27001:2022.', 'BSI Group India', 'AUD-ISO-27001-26', '2026-09-25', '2026-09-25', '2026-09-26', 'Yearly', 3, 'High', 1, 20, 3, 'Active', 1),
      (6, 1, 1, 3, 1, 'Rahul Verma Birthday Celebration', 'Team birthday greetings and virtual gift voucher dispatch.', NULL, 'BDAY-EMP-004', '2026-09-02', '2026-09-02', '2026-09-02', 'Yearly', 4, 'Low', 0, 1, NULL, 'Active', 1),
      (7, 1, 1, 1, 21, 'Microsoft 365 Enterprise E5 Licenses', '150 Seats Microsoft 365 E5 subscription renewal through CSP partner.', 'Redington India Ltd', 'MSFT-CSP-7712', '2026-10-15', '2025-10-15', '2026-10-15', 'Yearly', 3, 'Medium', 1, 30, 3, 'Active', 1),
      (8, 1, 1, 5, 15, 'Maharashtra Fire Safety NOC Renewal', 'Annual fire department inspection, hydrant test certificate, and NOC renewal.', 'Fire Dept Mumbai Suburbs', 'NOC-FIRE-2025-41', '2026-09-01', '2025-09-01', '2026-09-01', 'Yearly', 6, 'Critical', 1, 15, 6, 'Active', 1);
    `);

    await runSql(`
      INSERT INTO Tasks (TaskID, TaskNumber, CompanyID, LocationID, DepartmentID, CategoryID, TaskTitle, TaskDescription, AssignedByID, ManagerID, StartDate, DueDate, Priority, Status, PercentageComplete, EstimatedHours, ActualHours, CompletedDate)
      VALUES
      (1, 'TSK-2026-0001', 1, 1, 1, 1, 'Disaster Recovery & Offsite Database Backup Verification', 'Perform quarterly test restoration of SQL Server production backups into staging isolated cluster.', 1, 3, '2026-08-25', '2026-08-31', 'Critical', 'Overdue', 60, 8.0, 5.5, NULL),
      (2, 'TSK-2026-0002', 1, 1, 1, 1, 'ApexCorp.com Primary SSL Certificate Rotation', 'Update Cloudflare edge certificates and verify HTTPS strict transport security headers across all endpoints.', 1, 3, '2026-09-01', '2026-09-02', 'Critical', 'In Progress', 75, 4.0, 3.0, NULL),
      (3, 'TSK-2026-0003', 1, 1, 5, 1, 'CCTV AMC Vendor Contract Negotiation & SLA Sign-off', 'Review revised AMC quote with 2-hour SLA response for critical camera feeds and NVR redundancy.', 1, 6, '2026-09-01', '2026-09-06', 'High', 'In Progress', 40, 6.0, 2.5, NULL),
      (4, 'TSK-2026-0004', 1, 1, 2, 3, 'August 2026 Bank Reconciliation & Ledger Closing', 'Reconcile HDFC, ICICI, and Kotak main operational accounts. Match all inbound wire credits and tax deductions.', 1, 5, '2026-08-28', '2026-09-03', 'High', 'Waiting for Approval', 100, 12.0, 11.0, NULL),
      (5, 'TSK-2026-0005', 1, 1, 3, 4, 'Q3 Workplace Safety Training & Ergonomics Workshop', 'Conduct live and recorded safety awareness sessions for all Bangalore and Mumbai branch team members.', 1, 7, '2026-08-15', '2026-08-30', 'Medium', 'Completed', 100, 16.0, 15.5, '2026-08-29 17:30:00'),
      (6, 'TSK-2026-0006', 1, 1, 2, 3, 'Prepare GSTR-3B Tax Filing Worksheets for September', 'Gather output GST liability and input tax credit invoices from tally ERP for monthly filing.', 1, 5, '2026-09-05', '2026-09-18', 'High', 'New', 0, 10.0, 0.0, NULL),
      (7, 'TSK-2026-0007', 1, 1, 1, 2, 'ISO 27001 Access Control & Privilege Audit Preparation', 'Export active directory and database user privilege lists; verify quarterly access revocation logs.', 1, 3, '2026-09-02', '2026-09-22', 'High', 'In Progress', 35, 14.0, 4.0, NULL),
      (8, 'TSK-2026-0008', 1, 1, 4, 5, 'Annual Dell Server Hardware Upgrade Procurement', 'Awaiting final board budget sign-off for replacement of 3 Hyper-V cluster host nodes.', 1, 8, '2026-08-20', '2026-09-15', 'Medium', 'On Hold', 20, 20.0, 4.0, NULL),
      (9, 'TSK-2026-0009', 1, 1, 5, 1, 'Diesel Generator (DG Set) Fuel Level & Load Test', 'Conduct monthly 30-minute full-load test on 500kVA Cummins generator.', 1, 6, '2026-09-01', '2026-09-03', 'Medium', 'In Progress', 50, 3.0, 1.5, NULL),
      (10, 'TSK-2026-0010', 1, 1, 1, 1, 'Network Firewall Firmware Patch 7.4.2 Deployment', 'Apply security vulnerability patch to Fortinet HA cluster during midnight maintenance window.', 1, 3, '2026-09-02', '2026-09-04', 'Critical', 'Pending', 10, 4.0, 0.5, NULL),
      (11, 'TSK-2026-0011', 1, 1, 3, 4, 'Quarterly Employee Performance Review Cycle Launch', 'Distribute 360-degree self-appraisal forms to all team leads in HR portal.', 1, 7, '2026-09-05', '2026-09-25', 'Medium', 'New', 0, 15.0, 0.0, NULL),
      (12, 'TSK-2026-0012', 1, 1, 2, 3, 'Vendor TDS Deduction Certificates (Form 16A) Dispatch', 'Generate and mail Q1 Form 16A certificates to registered vendor accounts.', 1, 5, '2026-08-20', '2026-09-10', 'Medium', 'In Progress', 80, 8.0, 6.0, NULL),
      (13, 'TSK-2026-0013', 1, 1, 5, 2, 'Annual Fire Extinguisher Refill & Inspection', 'Hydro-test and refill 45 ABC dry powder and CO2 extinguishers across all 3 floors.', 1, 6, '2026-08-28', '2026-09-01', 'High', 'Overdue', 25, 6.0, 2.0, NULL),
      (14, 'TSK-2026-0014', 1, 1, 1, 6, 'Review End-user Antivirus & Patch Compliance Report', 'Verify Crowdstrike Falcon EDR sensor health across 240 employee laptops.', 1, 4, '2026-09-02', '2026-09-05', 'Medium', 'In Progress', 60, 5.0, 3.0, NULL),
      (15, 'TSK-2026-0015', 1, 1, 4, 5, 'Stationery & Office Consumables Bi-Monthly Order', 'Consolidate department requests and issue PO to approved supplier.', 1, 8, '2026-09-01', '2026-09-07', 'Low', 'Pending', 0, 4.0, 0.0, NULL);
    `);

    await runSql(`
      INSERT INTO TaskAssignees (TaskID, EmployeeID)
      VALUES 
      (1, 4), (1, 3), (2, 3), (3, 6), (4, 5), (5, 7), (6, 5), (7, 4), (8, 8), (9, 6), (10, 3), (11, 7), (12, 5), (13, 6), (14, 4), (15, 8);
    `);

    await runSql(`
      INSERT INTO TaskChecklist (TaskID, Title, IsCompleted, SortOrder)
      VALUES 
      (1, 'Verify latest differential backup file integrity in AWS S3 Glacier', 1, 1),
      (1, 'Spin up staging RDS SQL Server instance from backup snapshot', 1, 2),
      (1, 'Execute automated data integrity DBCC CHECKDB script', 1, 3),
      (1, 'Test core application read/write transactions against restored DB', 0, 4),
      (1, 'Sign off Disaster Recovery restoration audit log', 0, 5),
      (2, 'Generate 4096-bit RSA CSR for apexcorp.com and wildcard subdomains', 1, 1),
      (2, 'Submit verification through DNS TXT token challenge', 1, 2),
      (2, 'Upload signed PEM certificates to Cloudflare SSL management', 1, 3),
      (2, 'Run SSL Labs Qualys scanner to ensure A+ rating and HSTS validity', 0, 4);
    `);

    await runSql(`
      INSERT INTO TaskUpdates (TaskID, EmployeeID, PreviousStatus, NewStatus, PreviousProgress, NewProgress, TimeSpentHours, Remarks)
      VALUES (1, 4, 'In Progress', 'In Progress', 30, 60, 3.5, 'Successfully restored the 450GB DB snapshot into the staging cluster. Running DBCC CHECKDB currently.');
    `);

    await runSql(`
      INSERT INTO TaskComments (TaskID, UserID, CommentText)
      VALUES (1, 1, 'Please ensure this is completed before the ISO audit on the 25th. Excellent progress.');
    `);

    await runSql(`
      INSERT INTO TaskTemplates (TemplateID, CompanyID, DepartmentID, CategoryID, TemplateName, Description, EstimatedHours, Priority, ChecklistJSON)
      VALUES 
      (1, 1, 1, 1, 'Monthly IT Infrastructure Checklist', 'Standard recurring monthly health check for all core servers, firewalls, backups, and security endpoints.', 6.0, 'High', '["Verify Active Directory replication status","Run antivirus health audit on all endpoints","Check SAN storage space thresholds","Test offsite backup restore in sandbox","Review firewall drop logs for anomalies","Verify UPS battery self-test log"]'),
      (2, 1, 2, 3, 'Monthly Financial Closing Checklist', 'End of month financial reconciliation and compliance checklist.', 12.0, 'High', '["Reconcile all operational bank statements","Verify vendor payment vouchers and GST input invoices","Calculate employee TDS deductions","Generate monthly P&L and Balance Sheet draft","Archive petty cash expense receipts"]');
    `);

    await runSql(`
      INSERT INTO ReminderRules (RuleID, CompanyID, RuleName, TargetType, DaysOffset, Channel, IsActive)
      VALUES
      (1, 1, '30 Days Advance Notice', 'ImportantDate', -30, 'In-App', 1),
      (2, 1, '15 Days Advance Notice', 'ImportantDate', -15, 'In-App', 1),
      (3, 1, '7 Days Advance Notice', 'Both', -7, 'In-App', 1),
      (4, 1, '3 Days Urgent Notice', 'Both', -3, 'In-App', 1),
      (5, 1, '1 Day Final Warning', 'Both', -1, 'In-App', 1),
      (6, 1, 'On Due Date Alert', 'Both', 0, 'In-App', 1);
    `);

    await runSql(`
      INSERT INTO EscalationRules (EscalationID, CompanyID, DaysOverdue, EscalateToRole, Channel, IsActive)
      VALUES
      (1, 1, 1, 'Employee', 'In-App', 1),
      (2, 1, 2, 'Department Manager', 'In-App', 1),
      (3, 1, 5, 'Management', 'In-App', 1),
      (4, 1, 10, 'Super Admin', 'In-App', 1);
    `);

    console.log('[Database] Seed completed successfully.');
  }

  // Multi-tenant migration: seed default tenant and platform admin if not yet present
  const tenantCheck = await new Promise<any[]>((res) => {
    sqliteDb!.all(`SELECT TenantID FROM Tenants LIMIT 1`, (err: any, rows: any) => res(rows || []));
  });

  if (tenantCheck.length === 0) {
    console.log('[Database] Seeding multi-tenant platform data...');

    // 1. Create default tenant for all existing data
    await runSql(`
      INSERT INTO Tenants (TenantID, TenantCode, TenantName, LegalName, ContactPerson, ContactEmail, Industry, City, State, Country, SubscriptionTier, MaxCompanies, MaxUsers, LicenseStartDate, LicenseEndDate, EnabledModules, Status)
      VALUES (1, 'DEFAULT', 'Default Organization', 'Default Organization Pvt Ltd', 'System Admin', 'admin@company.com', 'Technology', 'Mumbai', 'Maharashtra', 'India', 'Enterprise', 100, 1000, '2025-01-01', '2030-12-31', '["tasks","dates","calendar","reports","audit"]', 'Active')
    `);

    // 2. Backfill TenantID = 1 on all existing records
    await runSql(`UPDATE Companies SET TenantID = 1 WHERE TenantID IS NULL`);
    await runSql(`UPDATE Users SET TenantID = 1 WHERE TenantID IS NULL`);
    await runSql(`UPDATE Employees SET TenantID = 1 WHERE TenantID IS NULL`);
    await runSql(`UPDATE AuditLogs SET TenantID = 1 WHERE TenantID IS NULL`);

    // 3. Add "Platform Admin" role if not exists
    const platformRoleCheck = await new Promise<any[]>((res) => {
      sqliteDb!.all(`SELECT RoleID FROM Roles WHERE RoleName = 'Platform Admin' LIMIT 1`, (err: any, rows: any) => res(rows || []));
    });
    if (platformRoleCheck.length === 0) {
      await runSql(`INSERT INTO Roles (RoleName, Description, IsSystemRole, IsPlatformRole) VALUES ('Platform Admin', 'Full platform access across all tenants and companies', 1, 1)`);
    }

    // 4. Get the Platform Admin role ID
    const platformRole = await new Promise<any[]>((res) => {
      sqliteDb!.all(`SELECT RoleID FROM Roles WHERE RoleName = 'Platform Admin' LIMIT 1`, (err: any, rows: any) => res(rows || []));
    });
    const platformRoleId = platformRole.length > 0 ? platformRole[0].RoleID : 7;

    // 5. Grant all permissions to Platform Admin role
    const allPerms = await new Promise<any[]>((res) => {
      sqliteDb!.all(`SELECT PermissionID FROM Permissions`, (err: any, rows: any) => res(rows || []));
    });
    for (const perm of allPerms) {
      try {
        await runSql(`INSERT INTO RolePermissions (RoleID, PermissionID) VALUES (${platformRoleId}, ${perm.PermissionID})`);
      } catch {}
    }

    // 6. Create Platform Super Admin user (sverpadmin) if not exists
    const platformUserCheck = await new Promise<any[]>((res) => {
      sqliteDb!.all(`SELECT UserID FROM Users WHERE Username = 'sverpadmin' LIMIT 1`, (err: any, rows: any) => res(rows || []));
    });
    if (platformUserCheck.length === 0) {
      const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'PlatformAdmin@2026!';
      const salt = bcrypt.genSaltSync(12);
      const platformPwdHash = bcrypt.hashSync(platformPassword, salt);
      await runSql(`
        INSERT INTO Users (CompanyID, EmployeeID, Username, Email, PasswordHash, RoleID, Status, TenantID, IsPlatformAdmin, MustChangePassword)
        VALUES (1, NULL, 'sverpadmin', 'platform@erp-system.com', '${platformPwdHash}', ${platformRoleId}, 'Active', NULL, 1, 1)
      `);
      console.log('[Database] Platform Super Admin (sverpadmin) created. Password sourced from PLATFORM_ADMIN_PASSWORD env var.');
    }

    console.log('[Database] Multi-tenant platform data seeded successfully.');
  }

  // Fix demo account password hashes: replace the old placeholder hash with a real bcrypt hash
  const oldFakeHash = '$2a$10$PjJbv9V0q5o1yv6d3mC44.yN7eU/rZ5L1vJqfQvV9B1o0W0s1p1r.';
  const usersWithFakeHash = await new Promise<any[]>((res) => {
    sqliteDb!.all(`SELECT UserID FROM Users WHERE PasswordHash = ?`, [oldFakeHash], (err: any, rows: any) => res(rows || []));
  });
  if (usersWithFakeHash.length > 0) {
    const realHash = bcrypt.hashSync('Password@123', 10);
    await new Promise<void>((resolve, reject) => {
      sqliteDb!.run(`UPDATE Users SET PasswordHash = ? WHERE PasswordHash = ?`, [realHash, oldFakeHash], (err: any) => {
        if (err) reject(err); else resolve();
      });
    });
    console.log(`[Database] Fixed ${usersWithFakeHash.length} user(s) with invalid password hashes.`);
  }
}

/**
 * Robust replacement for DATEDIFF(day, arg1, arg2)
 */
function replaceDateDiff(sql: string): string {
  let result = '';
  let i = 0;
  while (i < sql.length) {
    const diffIdx = sql.toUpperCase().indexOf('DATEDIFF(DAY,', i);
    if (diffIdx === -1) {
      result += sql.substring(i);
      break;
    }
    result += sql.substring(i, diffIdx);
    // Find matching parenthesis
    let startArg = diffIdx + 'DATEDIFF(DAY,'.length;
    let depth = 1;
    let currentArg = '';
    const args: string[] = [];
    let j = startArg;
    while (j < sql.length && depth > 0) {
      const char = sql[j];
      if (char === '(') depth++;
      else if (char === ')') depth--;

      if ((char === ',' && depth === 1) || (char === ')' && depth === 0)) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
      j++;
    }

    if (args.length >= 2) {
      const arg1 = args[0];
      const arg2 = args[1];
      result += `(CAST(round(julianday(${arg2}) - julianday(${arg1})) AS INTEGER))`;
    } else {
      result += sql.substring(diffIdx, j);
    }
    i = j;
  }
  return result;
}

function replaceDateAddSqlite(sqlStr: string): string {
  let result = '';
  let i = 0;
  while (i < sqlStr.length) {
    const addIdx = sqlStr.toUpperCase().indexOf('DATEADD(', i);
    if (addIdx === -1) {
      result += sqlStr.substring(i);
      break;
    }
    result += sqlStr.substring(i, addIdx);
    let startArg = addIdx + 'DATEADD('.length;
    let depth = 1;
    let currentArg = '';
    const args: string[] = [];
    let j = startArg;
    while (j < sqlStr.length && depth > 0) {
      const char = sqlStr[j];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      if ((char === ',' && depth === 1) || (char === ')' && depth === 0)) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
      j++;
    }
    if (args.length >= 3) {
      const unit = args[0].toUpperCase();
      const interval = args[1];
      const dateExpr = args[2];
      let modifier = 'days';
      if (unit.includes('MINUTE') || unit === 'MI' || unit === 'N') modifier = 'minutes';
      else if (unit.includes('HOUR') || unit === 'HH') modifier = 'hours';
      else if (unit.includes('MONTH') || unit === 'M' || unit === 'MM') modifier = 'months';
      else if (unit.includes('YEAR') || unit === 'YY' || unit === 'YYYY') modifier = 'years';
      else if (unit.includes('SECOND') || unit === 'SS' || unit === 'S') modifier = 'seconds';
      result += `datetime(${dateExpr}, '+' || ${interval} || ' ${modifier}')`;
    } else {
      result += sqlStr.substring(addIdx, j);
    }
    i = j;
  }
  return result;
}

/**
 * Translates SQL Server T-SQL dialect to MySQL/MariaDB
 */
function translateQueryForMysql(queryText: string, params: Record<string, any>): { sql: string; values: any[] } {
  let q = queryText;

  // Remove dbo. prefix
  q = q.replace(/dbo\./g, '');

  // Handle TOP N queries: SELECT TOP 10 ... -> SELECT ... LIMIT 10
  let limitFromTop: number | null = null;
  q = q.replace(/SELECT\s+TOP\s+(\d+)/i, (match, count) => {
    limitFromTop = parseInt(count, 10);
    return 'SELECT';
  });

  // Clean N-prefixed strings
  q = q.replace(/N'([^']*)'/g, "'$1'");

  // Date functions
  q = q.replace(/CAST\(GETDATE\(\) AS DATE\)/gi, 'CURDATE()');
  q = q.replace(/GETDATE\(\)/gi, 'NOW()');
  q = q.replace(/SYSUTCDATETIME\(\)/gi, 'UTC_TIMESTAMP()');

  // ISNULL → IFNULL
  q = q.replace(/ISNULL\(/gi, 'IFNULL(');

  // DATEDIFF(day, a, b) → DATEDIFF(b, a) — MySQL DATEDIFF returns days, args reversed
  q = replaceDateDiffMysql(q);

  // DATEADD(unit, N, date) → DATE_ADD(date, INTERVAL N unit) with parenthesis-depth parsing
  q = replaceDateAddMysql(q);

  // CAST(x AS DATE)
  q = q.replace(/CAST\(([^)]+)\s+AS\s+DATE\)/gi, 'DATE($1)');
  q = q.replace(/CAST\(([^)]+)\s+AS\s+DECIMAL\(([^)]+)\)\)/gi, 'CAST($1 AS DECIMAL($2))');

  // STRING_AGG → GROUP_CONCAT
  q = q.replace(/STRING_AGG\(([^,]+),\s*'([^']+)'\)/gi, "GROUP_CONCAT($1 SEPARATOR '$2')");

  // OUTPUT INSERTED.* — not supported in MySQL, remove
  q = q.replace(/OUTPUT INSERTED\.(\w+)/gi, '');

  // Pagination: OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY → LIMIT @limitNum OFFSET @offset
  const offsetMatch = q.match(/OFFSET\s+@offset\s+ROWS\s+FETCH\s+NEXT\s+@limitNum\s+ROWS\s+ONLY/i);
  if (offsetMatch) {
    q = q.replace(offsetMatch[0], 'LIMIT @limitNum OFFSET @offset');
  } else if (limitFromTop !== null && !q.toUpperCase().includes('LIMIT')) {
    q += ` LIMIT ${limitFromTop}`;
  }

  // Extract named parameters → positional ?
  const paramValues: any[] = [];
  const paramMatches = q.match(/@(\w+)/g);
  if (paramMatches) {
    for (const match of paramMatches) {
      const paramName = match.substring(1);
      if (params.hasOwnProperty(paramName)) {
        paramValues.push(params[paramName]);
      } else {
        paramValues.push(null);
      }
    }
  }

  q = q.replace(/@\w+/g, '?');

  return { sql: q, values: paramValues };
}

function replaceDateAddMysql(sqlStr: string): string {
  let result = '';
  let i = 0;
  while (i < sqlStr.length) {
    const addIdx = sqlStr.toUpperCase().indexOf('DATEADD(', i);
    if (addIdx === -1) {
      result += sqlStr.substring(i);
      break;
    }
    result += sqlStr.substring(i, addIdx);
    let startArg = addIdx + 'DATEADD('.length;
    let depth = 1;
    let currentArg = '';
    const args: string[] = [];
    let j = startArg;
    while (j < sqlStr.length && depth > 0) {
      const char = sqlStr[j];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      if ((char === ',' && depth === 1) || (char === ')' && depth === 0)) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
      j++;
    }
    if (args.length >= 3) {
      const unit = args[0].toUpperCase();
      const interval = args[1];
      const dateExpr = args[2];
      let intervalUnit = 'DAY';
      if (unit.includes('MINUTE') || unit === 'MI' || unit === 'N') intervalUnit = 'MINUTE';
      else if (unit.includes('HOUR') || unit === 'HH') intervalUnit = 'HOUR';
      else if (unit.includes('MONTH') || unit === 'M' || unit === 'MM') intervalUnit = 'MONTH';
      else if (unit.includes('YEAR') || unit === 'YY' || unit === 'YYYY') intervalUnit = 'YEAR';
      else if (unit.includes('SECOND') || unit === 'SS' || unit === 'S') intervalUnit = 'SECOND';
      result += `DATE_ADD(${dateExpr}, INTERVAL ${interval} ${intervalUnit})`;
    } else {
      result += sqlStr.substring(addIdx, j);
    }
    i = j;
  }
  return result;
}

function replaceDateDiffMysql(sqlStr: string): string {
  let result = '';
  let i = 0;
  while (i < sqlStr.length) {
    const diffIdx = sqlStr.toUpperCase().indexOf('DATEDIFF(DAY,', i);
    if (diffIdx === -1) {
      result += sqlStr.substring(i);
      break;
    }
    result += sqlStr.substring(i, diffIdx);
    let startArg = diffIdx + 'DATEDIFF(DAY,'.length;
    let depth = 1;
    let currentArg = '';
    const args: string[] = [];
    let j = startArg;
    while (j < sqlStr.length && depth > 0) {
      const char = sqlStr[j];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      if ((char === ',' && depth === 1) || (char === ')' && depth === 0)) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
      j++;
    }
    if (args.length >= 2) {
      // MySQL DATEDIFF(end, start) — opposite of T-SQL DATEDIFF(day, start, end)
      result += `DATEDIFF(${args[1]}, ${args[0]})`;
    } else {
      result += sqlStr.substring(diffIdx, j);
    }
    i = j;
  }
  return result;
}

/**
 * Translates SQL Server T-SQL dialect to ANSI/SQLite when in SQLite mode
 */
function translateQueryForSqlite(queryText: string, params: Record<string, any>): { sql: string; values: any[] } {
  let q = queryText;

  // 1. Remove dbo. prefix
  q = q.replace(/dbo\./g, '');

  // 2. Handle TOP N queries: SELECT TOP 10 ... -> SELECT ... LIMIT 10
  let limitFromTop: number | null = null;
  q = q.replace(/SELECT\s+TOP\s+(\d+)/i, (match, count) => {
    limitFromTop = parseInt(count, 10);
    return 'SELECT';
  });

  // 3. Clean built-ins & Unicode literals
  q = q.replace(/N'([^']*)'/g, "'$1'");
  q = q.replace(/CAST\(GETDATE\(\) AS DATE\)/gi, `date('now')`);
  q = q.replace(/GETDATE\(\)/gi, `date('now')`);
  q = q.replace(/SYSUTCDATETIME\(\)/gi, `datetime('now')`);
  q = q.replace(/ISNULL\(/gi, `COALESCE(`);

  // 4. Parse DATEDIFF(day, a, b)
  q = replaceDateDiff(q);

  // Handle DATEADD(unit, N, date) with parenthesis-depth parsing
  q = replaceDateAddSqlite(q);

  // Clean remaining CAST(... AS DATE) or DECIMAL
  q = q.replace(/CAST\(([^)]+)\s+AS\s+DATE\)/gi, `date($1)`);
  q = q.replace(/CAST\(([^)]+)\s+AS\s+DECIMAL\([^)]+\)\)/gi, `ROUND($1, 1)`);

  // Group Concat & Output
  q = q.replace(/STRING_AGG\(([^,]+),\s*'([^']+)'\)/gi, `GROUP_CONCAT($1, '$2')`);
  q = q.replace(/OUTPUT INSERTED\.(\w+)/gi, ``);

  // Pagination syntax: OFFSET @offset ROWS FETCH NEXT @limitNum ROWS ONLY -> LIMIT @limitNum OFFSET @offset
  const offsetMatch = q.match(/OFFSET\s+@offset\s+ROWS\s+FETCH\s+NEXT\s+@limitNum\s+ROWS\s+ONLY/i);
  if (offsetMatch) {
    q = q.replace(offsetMatch[0], `LIMIT @limitNum OFFSET @offset`);
  } else if (limitFromTop !== null && !q.toUpperCase().includes('LIMIT')) {
    q += ` LIMIT ${limitFromTop}`;
  }

  // Extract named parameters into positional ?
  const paramValues: any[] = [];
  const paramMatches = q.match(/@(\w+)/g);
  if (paramMatches) {
    for (const match of paramMatches) {
      const paramName = match.substring(1);
      if (params.hasOwnProperty(paramName)) {
        paramValues.push(params[paramName]);
      } else {
        paramValues.push(null);
      }
    }
  }

  q = q.replace(/@\w+/g, '?');

  return { sql: q, values: paramValues };
}

/**
 * Universal Query Execution (Supports both SQL Server and SQLite)
 */
export async function executeQuery<T = any>(
  queryText: string,
  params: Record<string, any> = {}
): Promise<{ recordset: T[]; rowsAffected: number[] }> {
  await getDbPool();

  if (activeEngine === 'mysql' && mysqlPool) {
    const { sql: translatedSql, values } = translateQueryForMysql(queryText, params);
    const isSelect = translatedSql.trim().toUpperCase().startsWith('SELECT');

    try {
      const [result, fields] = await mysqlPool.execute(translatedSql, values);
      if (isSelect) {
        const rows = (result as any[]).map((row: any) => {
          const newRow: any = { ...row };
          for (const key of Object.keys(newRow)) {
            if (
              (key.endsWith('Date') || key.endsWith('At')) &&
              newRow[key] instanceof Date
            ) {
              // Keep as Date object for consistency
            }
          }
          return newRow;
        });
        return { recordset: rows as T[], rowsAffected: [rows.length] };
      } else {
        const info = result as any;
        const recordset: any[] = [];
        if (info.insertId) {
          recordset.push({
            CompanyID: info.insertId,
            UserCompanyID: info.insertId,
            TaskID: info.insertId,
            ImportantDateID: info.insertId,
            EmployeeID: info.insertId,
            UserID: info.insertId,
            LocationID: info.insertId,
            DepartmentID: info.insertId,
            CategoryID: info.insertId,
            TemplateID: info.insertId,
            CommentID: info.insertId,
            AttachmentID: info.insertId,
            ActivityID: info.insertId,
            TenantID: info.insertId,
            RegistrationID: info.insertId,
          });
        }
        return { recordset: recordset as T[], rowsAffected: [info.affectedRows || 0] };
      }
    } catch (err: any) {
      console.error('[MySQL Query Error]:', err.message, '\nSQL:', translatedSql);
      throw err;
    }
  } else if (activeEngine === 'mssql' && mssqlPool && mssqlPool.connected) {
    const request = mssqlPool.request();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        request.input(key, sql!.NVarChar, null);
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          request.input(key, sql!.Int, value);
        } else {
          request.input(key, sql!.Decimal(10, 2), value);
        }
      } else if (typeof value === 'boolean') {
        request.input(key, sql!.Bit, value ? 1 : 0);
      } else if (value instanceof Date) {
        request.input(key, sql!.DateTime2, value);
      } else {
        request.input(key, sql!.NVarChar, String(value));
      }
    }
    const result = await request.query(queryText);
    return { recordset: result.recordset as T[], rowsAffected: result.rowsAffected };
  } else {
    // Execute on SQLite
    const { sql: translatedSql, values } = translateQueryForSqlite(queryText, params);

    return new Promise((resolve, reject) => {
      const isSelect = translatedSql.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        sqliteDb!.all(translatedSql, values, (err: any, rows: any) => {
          if (err) {
            console.error('[SQLite Query Error]:', err.message, '\nSQL:', translatedSql);
            return reject(err);
          }
          const mappedRows = (rows || []).map((row: any) => {
            const newRow: any = { ...row };
            for (const key of Object.keys(newRow)) {
              if (
                (key.endsWith('Date') || key.endsWith('At')) &&
                typeof newRow[key] === 'string' &&
                newRow[key].match(/^\d{4}-\d{2}-\d{2}/)
              ) {
                newRow[key] = new Date(newRow[key]);
              }
            }
            return newRow;
          });
          resolve({ recordset: mappedRows as T[], rowsAffected: [mappedRows.length] });
        });
      } else {
        sqliteDb!.run(translatedSql, values, function (this: any, err: Error | null) {
          if (err) {
            console.error('[SQLite Exec Error]:', err.message, '\nSQL:', translatedSql);
            return reject(err);
          }
          const recordset: any[] = [];
          if (this.lastID) {
            recordset.push({
              CompanyID: this.lastID,
              UserCompanyID: this.lastID,
              TaskID: this.lastID,
              ImportantDateID: this.lastID,
              EmployeeID: this.lastID,
              UserID: this.lastID,
              LocationID: this.lastID,
              DepartmentID: this.lastID,
              CategoryID: this.lastID,
              TemplateID: this.lastID,
              CommentID: this.lastID,
              AttachmentID: this.lastID,
              ActivityID: this.lastID,
              TenantID: this.lastID,
              RegistrationID: this.lastID,
            });
          }
          resolve({ recordset: recordset as T[], rowsAffected: [this.changes] });
        });
      }
    });
  }
}

export { sql };
export default { getDbPool, executeQuery, sql };
