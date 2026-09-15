import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CalendarClock,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Building,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { dashboardApi } from '../services/api';
import { DashboardData, ImportantDateItem } from '../types';
import { StatCard } from '../components/dashboard/StatCard';
import { StatusChart } from '../components/dashboard/StatusChart';
import { DepartmentChart } from '../components/dashboard/DepartmentChart';
import { UpcomingDatesWidget } from '../components/dashboard/UpcomingDatesWidget';
import { OverdueTasksWidget } from '../components/dashboard/OverdueTasksWidget';
import { MyDayWidget } from '../components/dashboard/MyDayWidget';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { DateFormModal } from '../components/importantDates/DateFormModal';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { activeCompanyId, activeCompany } = useTenant();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isDateFormOpen, setIsDateFormOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await dashboardApi.getDashboardData();
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeCompanyId]);

  const handleOpenTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailOpen(true);
  };

  const kpis = dashboardData?.kpis || {
    dueToday: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    waitingApprovalTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    totalImportantDates: 0,
    expiringSoonDates: 0,
    expiredDates: 0,
  };

  if (isLoading || !dashboardData) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400 font-medium">Gathering organizational metrics...</p>
      </div>
    );
  }

  const { charts, upcomingDates, overdueTasks, myDayTasks } = dashboardData;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60 text-xs font-semibold mb-2">
            <Building className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            ACTIVE TENANT: {activeCompany?.CompanyName || user?.companyName} {activeCompany?.CompanyCode ? `[${activeCompany.CompanyCode}]` : ''}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Welcome back, {user?.employeeName || user?.username}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scoped analytics and task workflows for <strong className="text-slate-700 dark:text-slate-300">{activeCompany?.CompanyName || user?.companyName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {hasPermission('tasks.create') && (
            <Button onClick={() => setIsTaskFormOpen(true)} icon={<Plus className="w-4 h-4" />}>
              Create Task
            </Button>
          )}
          {hasPermission('dates.create') && (
            <Button variant="secondary" onClick={() => setIsDateFormOpen(true)} icon={<CalendarClock className="w-4 h-4 text-purple-600" />}>
              Add Important Date
            </Button>
          )}
        </div>
      </div>

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Due Today"
          value={kpis.dueToday}
          subtitle="Tasks requiring completion today"
          icon={<Clock className="w-6 h-6" />}
          color="indigo"
          onClick={() => navigate('/tasks?filter=today')}
        />
        <StatCard
          title="Overdue Tasks"
          value={kpis.overdueTasks}
          subtitle="Breached committed deadlines"
          icon={<AlertTriangle className="w-6 h-6" />}
          color="rose"
          onClick={() => navigate('/tasks?filter=overdue')}
        />
        <StatCard
          title="In Progress"
          value={kpis.inProgressTasks}
          subtitle="Active ongoing workload"
          icon={<CheckSquare className="w-6 h-6" />}
          color="sky"
          onClick={() => navigate('/tasks?filter=in_progress')}
        />
        <StatCard
          title="Upcoming Dates"
          value={kpis.totalImportantDates}
          subtitle={`${kpis.expiringSoonDates} expiring within 7 days`}
          icon={<CalendarClock className="w-6 h-6" />}
          color="purple"
          onClick={() => navigate('/important-dates')}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => navigate('/tasks?filter=waiting_approval')}
          className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 rounded-2xl cursor-pointer hover:bg-amber-100/60 transition"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Waiting Approval
          </span>
          <div className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">
            {kpis.waitingApprovalTasks}
          </div>
        </div>

        <div
          onClick={() => navigate('/tasks?filter=completed')}
          className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900 rounded-2xl cursor-pointer hover:bg-emerald-100/60 transition"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Completed Tasks
          </span>
          <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
            {kpis.completedTasks}
          </div>
        </div>

        <div
          onClick={() => navigate('/tasks')}
          className="p-3.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-200/60 transition"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Total Tasks
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
            {kpis.totalTasks}
          </div>
        </div>

        <div
          onClick={() => navigate('/important-dates?filter=critical')}
          className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900 rounded-2xl cursor-pointer hover:bg-rose-100/60 transition"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            Expiring Critical
          </span>
          <div className="text-xl font-extrabold text-rose-900 dark:text-rose-200 mt-0.5">
            {kpis.expiringSoonDates}
          </div>
        </div>
      </div>

      {/* Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Task Status Distribution"
          subtitle="Real-time breakdown of all organizational tasks by current stage"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} icon={<ArrowUpRight className="w-4 h-4" />}>
              View All
            </Button>
          }
        >
          <StatusChart
            data={charts.statusBreakdown || []}
            onSliceClick={(status) => navigate(`/tasks?status=${status}`)}
          />
        </Card>

        <Card
          title="Department Workload & Completion"
          subtitle="Comparative task load, completed ratio, and overdue risk per department"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} icon={<ArrowUpRight className="w-4 h-4" />}>
              Full Report
            </Button>
          }
        >
          <DepartmentChart
            data={charts.departmentBreakdown || []}
            onBarClick={(dept) => navigate(`/tasks?search=${dept}`)}
          />
        </Card>
      </div>

      {/* Two Widget Columns: Upcoming Dates + Overdue Tasks + My Day */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Upcoming Dates & Overdue Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Upcoming Important Dates & Renewals (Next 30 Days)"
            subtitle="Contracts, AMCs, licenses, and renewals with lead time notifications"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/important-dates')} icon={<ArrowUpRight className="w-4 h-4" />}>
                All Dates
              </Button>
            }
          >
            <UpcomingDatesWidget dates={upcomingDates || []} />
          </Card>

          <Card
            title="Overdue Tasks Action Table"
            subtitle="Immediate attention required for breached SLA tasks"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks?filter=overdue')} icon={<ArrowUpRight className="w-4 h-4" />}>
                Manage
              </Button>
            }
          >
            <OverdueTasksWidget tasks={overdueTasks || []} />
          </Card>
        </div>

        {/* Col 3: My Day Quick Actions */}
        <div className="space-y-6">
          <Card
            title="My Day Priority Queue"
            subtitle="Tasks assigned directly to you"
            action={
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                {myDayTasks?.length || 0} active
              </span>
            }
          >
            <MyDayWidget tasks={myDayTasks || []} onOpenTask={handleOpenTask} />
          </Card>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={isTaskDetailOpen}
          onClose={() => {
            setIsTaskDetailOpen(false);
            setSelectedTaskId(null);
          }}
          onTaskUpdated={fetchDashboard}
        />
      )}

      {/* Create Task Modal */}
      {isTaskFormOpen && (
        <TaskFormModal
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onTaskCreated={fetchDashboard}
        />
      )}

      {/* Create Important Date Modal */}
      {isDateFormOpen && (
        <DateFormModal
          isOpen={isDateFormOpen}
          onClose={() => setIsDateFormOpen(false)}
          onDateCreated={fetchDashboard}
        />
      )}
    </div>
  );
};
