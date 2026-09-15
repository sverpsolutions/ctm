# Company Important Date & Task Management System

A production-grade, web-based enterprise application built for **Apex Global Solutions Pvt Ltd** to streamline organization-wide task workflows, tracking of critical compliance/contract dates, automated reminder schedules, escalation hierarchies, and executive analytics.

---

## 🌟 Key Features

### 1. Unified Management Dashboard
- **Live KPI Metric Cards**: Today's tasks, Overdue breaches, In-Progress workload, and Approaching Important Dates.
- **Interactive Visualizations**:
  - Task Status Distribution (Chart.js Doughnut)
  - Department Workload & Overdue Risk Analysis (Chart.js Bar)
- **Urgent Deadlines Widget**: Smart countdown tags (**Critical 0-3d**, **Urgent 4-7d**, **Upcoming 8-30d**, **Expired**).
- **Overdue Tasks Table**: Immediate action overview for tasks that exceeded committed due dates.
- **My Day Priority Queue**: Fast task execution and checklist updates for logged-in employees.

### 2. Advanced Task Management & Workflows
- **Dual View Modes**: Switch between an **Advanced Data Table** and an interactive **Kanban Board** with drag-and-drop state transitions.
- **Comprehensive Task Modal**:
  - Interactive checklists with progress calculation (`completed / total`)
  - Progress logging with timestamps, time spent in hours, and status transitions
  - Rich conversation stream with team mentions
  - Multi-file attachment dropzone (PDF, PNG, JPG, DOCX, XLSX)
  - Immutable activity audit history
  - **Manager Approval Workflow**: Submit for Approval &rarr; Manager Review &rarr; Approve (Mark Completed) or Reject with mandatory feedback.
- **Pre-defined Task Templates**: 1-click instantiation for recurring monthly IT checks, financial closings, and quarterly safety audits.
- **Multi-Row Bulk Operations**: Bulk status changes, priority reassignment, deletion, and Excel export.

### 3. Important Dates & Renewal Tracking
- **22 Pre-Configured Categories**: Contract Expiry, AMC, Warranties, Insurance, License, Registration, Leases, Payments, Tax Dates, Audits, Employee Birthdays, and Work Anniversaries.
- **Smart Urgency Horizon Tabs**: Filter records by Critical, Urgent, Upcoming, Future, and Expired.
- **Automated Task Generator**: Configurable lead days (e.g., 7, 15, 30 days prior) to auto-generate actionable workflow tasks assigned to responsible personnel.
- **Renewal Cycle History**: Logs previous expiry dates, renewed dates, payment remarks, and documents across years.

### 4. Unified Company Calendar
- Consolidated **Month View** and **Agenda View** combining:
  - Task due dates (color-coded by priority: Critical, High, Medium, Low)
  - Contract & AMC renewal deadlines
  - Employee Birthdays & Work Anniversaries
- Popover click dialogs for instant task and date inspection.

### 5. Executive Reports & Analytics
- **Filterable Task Reports** with instant export to **Excel (.xlsx)** and **PDF**.
- **Important Date Horizon Reports** (7, 15, 30, 60, 90 days scope).
- **Staff Performance Scorecards**: On-time delivery rates, total assigned, and completed hours.
- **Department Analytics**: Comparative workload analysis across operational divisions.

### 6. Masters, RBAC Security Matrix & Settings
- **Company Profile**: Legal entity, GSTIN, PAN, and financial year settings.
- **Locations & Branches**: Regional office tracking.
- **Department Master**: Hierarchies and department heads.
- **Staff Directory**: Employee registry with automated login provisioning.
- **Granular RBAC Matrix**: 19 security permissions across 6 system roles (Super Admin, Company Admin, Management, Dept Manager, Employee, Viewer).
- **Reminder & Escalation Rules**: Configurable advance notification offsets (-30d, -15d, -7d, -3d, -1d, 0d) and 4-tier overdue escalation hierarchy.
- **Background Cron Scheduler**: Automated daily maintenance job with **Idempotent deduplication** to ensure recipients are never spammed.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Chart.js, Lucide Icons, jsPDF, XLSX |
| **Backend** | Node.js, Express, TypeScript, JWT Bearer Auth, Multer, Node-Cron, Bcrypt |
| **Database** | Dual-Engine Architecture: **Microsoft SQL Server 2022** + Local **Enterprise SQLite Engine** |

---

## 🔑 Demo Login Personas

All demo accounts use the standard password: **`Password@123`**

| Persona | Email / Username | Role & Permissions |
|---|---|---|
| **Super Admin** | `admin@company.com` | Full enterprise control, master records, security matrix, all approvals |
| **IT Manager** | `manager.it@company.com` | Department task assignment, approval workflow, IT dates |
| **Finance Admin** | `finance.admin@company.com` | Company settings, tax & payment deadlines, financial closing tasks |
| **Employee (Rahul)** | `employee.rahul@company.com` | My Day tasks, progress logging, checklist completion, remarks |
| **Viewer** | `viewer@company.com` | Read-only executive dashboard and calendar view |

---

## 🚀 Getting Started & Execution

### Prerequisites
- Node.js (v18+)
- Local SQL Server 2022 (Optional: the system automatically falls back to the embedded zero-friction SQLite engine if SQL Server is not reachable).

### Starting the Application

From the root directory:

```bash
# 1. Start both Backend (Port 5000) and Frontend (Port 5173) concurrently:
npm run dev
```

Or start services individually:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## 🗄️ SQL Server 2022 Manual Migration (Optional)

To initialize the schema directly on your Microsoft SQL Server instance:

```bash
cd backend
npm run db:setup
npm run db:seed
```

Or execute via `sqlcmd`:
```bash
sqlcmd -S .\SQLEXPRESS -E -i database\schema.sql
sqlcmd -S .\SQLEXPRESS -E -i database\seed.sql
```

---

## 📋 API Endpoints Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Authenticate user and issue JWT |
| `/api/auth/me` | GET | Retrieve authenticated profile and permissions |
| `/api/dashboard` | GET | Real-time KPIs, status charts, upcoming dates, and overdue tasks |
| `/api/tasks` | GET/POST | List and create business tasks |
| `/api/tasks/:id` | GET/PUT/DELETE | Task details, update, and soft deletion |
| `/api/tasks/:id/progress` | POST | Log progress percentage, remarks, and time spent |
| `/api/tasks/:id/approve` | POST | Manager approval action |
| `/api/tasks/:id/reject` | POST | Manager rejection with reason |
| `/api/tasks/:id/comments` | POST | Post task comment |
| `/api/tasks/:id/attachments` | POST | Upload documents |
| `/api/tasks/bulk` | POST | Bulk status, priority, and delete actions |
| `/api/important-dates` | GET/POST | List and create important dates |
| `/api/important-dates/:id/renew` | POST | Execute renewal cycle and update expiry |
| `/api/calendar` | GET | Unified event schedule feed |
| `/api/reports/tasks` | GET | Filterable task reports and completion rates |
| `/api/reports/important-dates` | GET | Expiry horizon reports |
| `/api/reports/employee-performance` | GET | Staff scorecard analytics |
| `/api/masters/*` | GET/POST/PUT | Companies, Locations, Departments, Staff, and RBAC matrix |
| `/api/notifications` | GET/PUT | User notifications and unread badge count |
| `/api/settings` | GET/POST | Reminder and escalation rules configuration |
| `/api/audit-logs` | GET | Immutable system activity trail |
