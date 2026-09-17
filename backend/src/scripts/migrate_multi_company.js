const path = require('path');
const sqlite3 = require('../../node_modules/sqlite3');
const dbPath = path.join(__dirname, '../../database/company_task.db');

console.log(`[Migration] Connecting to SQLite DB: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  // 1. Check & Alter Tasks columns
  db.all("PRAGMA table_info(Tasks)", (err, columns) => {
    if (err) {
      console.error('Error fetching Tasks columns:', err);
      return;
    }
    const colNames = columns.map(c => c.name);
    console.log('[Migration] Existing Tasks columns:', colNames);

    if (!colNames.includes('TaskType')) {
      db.run("ALTER TABLE Tasks ADD COLUMN TaskType TEXT DEFAULT 'General'", (err) => {
        if (err) console.error('Error adding TaskType:', err);
        else console.log('[Migration] Added TaskType column to Tasks');
      });
    }

    if (!colNames.includes('ReminderDate')) {
      db.run("ALTER TABLE Tasks ADD COLUMN ReminderDate TEXT", (err) => {
        if (err) console.error('Error adding ReminderDate:', err);
        else console.log('[Migration] Added ReminderDate column to Tasks');
      });
    }

    if (!colNames.includes('Remarks')) {
      db.run("ALTER TABLE Tasks ADD COLUMN Remarks TEXT", (err) => {
        if (err) console.error('Error adding Remarks:', err);
        else console.log('[Migration] Added Remarks column to Tasks');
      });
    }

    if (!colNames.includes('UpdatedBy')) {
      db.run("ALTER TABLE Tasks ADD COLUMN UpdatedBy INTEGER", (err) => {
        if (err) console.error('Error adding UpdatedBy to Tasks:', err);
        else console.log('[Migration] Added UpdatedBy column to Tasks');
      });
    }

    if (!colNames.includes('CreatedBy')) {
      db.run("ALTER TABLE Tasks ADD COLUMN CreatedBy INTEGER", (err) => {
        if (err) console.error('Error adding CreatedBy to Tasks:', err);
        else console.log('[Migration] Added CreatedBy column to Tasks');
      });
    }
  });

  // 2. Check & Alter UserCompany columns
  db.all("PRAGMA table_info(UserCompany)", (err, columns) => {
    if (err) {
      console.error('Error fetching UserCompany columns:', err);
      return;
    }
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('CreatedBy')) {
      db.run("ALTER TABLE UserCompany ADD COLUMN CreatedBy INTEGER", (err) => {
        if (err) console.error('Error adding CreatedBy to UserCompany:', err);
        else console.log('[Migration] Added CreatedBy column to UserCompany');
      });
    }
    if (!colNames.includes('UpdatedBy')) {
      db.run("ALTER TABLE UserCompany ADD COLUMN UpdatedBy INTEGER", (err) => {
        if (err) console.error('Error adding UpdatedBy to UserCompany:', err);
        else console.log('[Migration] Added UpdatedBy column to UserCompany');
      });
    }
  });

  // 3. Create tbl_user_companies mapping table
  db.run(`
    CREATE TABLE IF NOT EXISTS tbl_user_companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_by INTEGER,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, company_id)
    )
  `, (err) => {
    if (err) console.error('Error creating tbl_user_companies:', err);
    else {
      console.log('[Migration] tbl_user_companies table ready');

      // 4. Sync initial data from UserCompany into tbl_user_companies
      db.run(`
        INSERT OR IGNORE INTO tbl_user_companies (user_id, company_id, is_active, created_at, updated_at)
        SELECT UserID, CompanyID, IsActive, CreatedAt, UpdatedAt FROM UserCompany
      `, (syncErr) => {
        if (syncErr) console.error('Error syncing UserCompany into tbl_user_companies:', syncErr);
        else {
          db.all("SELECT COUNT(*) AS cnt FROM tbl_user_companies", (cErr, rows) => {
            console.log(`[Migration] tbl_user_companies record count: ${rows ? rows[0].cnt : 0}`);
          });
        }
      });
    }
  });

  // 5. Create tbl_tasks view
  db.run(`
    CREATE VIEW IF NOT EXISTS tbl_tasks AS
    SELECT 
      TaskID AS id,
      CompanyID AS company_id,
      TaskTitle AS task_title,
      TaskDescription AS task_description,
      TaskType AS task_type,
      Priority AS priority,
      (SELECT EmployeeID FROM TaskAssignees WHERE TaskID = Tasks.TaskID LIMIT 1) AS assigned_to,
      StartDate AS start_date,
      DueDate AS due_date,
      ReminderDate AS reminder_date,
      Status AS status,
      Remarks AS remarks,
      AssignedByID AS created_by,
      CreatedAt AS created_at,
      UpdatedBy AS updated_by,
      UpdatedAt AS updated_at
    FROM Tasks
  `, (err) => {
    if (err) console.error('Error creating tbl_tasks view:', err);
    else console.log('[Migration] tbl_tasks view ready');
  });

  // 6. Ensure indices
  db.run("CREATE INDEX IF NOT EXISTS IX_Tasks_CompanyID ON Tasks(CompanyID)", () => {});
  db.run("CREATE INDEX IF NOT EXISTS IX_tbl_user_companies_user ON tbl_user_companies(user_id)", () => {});
  db.run("CREATE INDEX IF NOT EXISTS IX_tbl_user_companies_company ON tbl_user_companies(company_id)", () => {});

  setTimeout(() => {
    console.log('[Migration] Migration complete!');
    db.close();
  }, 1000);
});
