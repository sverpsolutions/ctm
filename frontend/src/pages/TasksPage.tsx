import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  LayoutGrid,
  List,
  Plus,
  Filter,
  Search,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { tasksApi, mastersApi } from '../services/api';
import { TaskItem, Department, Employee } from '../types';
import { TaskListView } from '../components/tasks/TaskListView';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { BulkActionBar } from '../components/tasks/BulkActionBar';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';

export const TasksPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { activeCompanyId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 15 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Sorting & Selection
  const [sortBy, setSortBy] = useState('DueDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  // Handle URL highlight param
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setSelectedTaskId(parseInt(highlightId, 10));
      setIsDetailOpen(true);
    }
    const filterParam = searchParams.get('filter');
    if (filterParam === 'overdue') setStatusFilter('Overdue');
    if (filterParam === 'in_progress') setStatusFilter('In Progress');
    if (filterParam === 'waiting_approval') setStatusFilter('Waiting for Approval');
    if (filterParam === 'completed') setStatusFilter('Completed');
  }, [searchParams]);

  const fetchTasks = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await tasksApi.getTasks({
        page: viewMode === 'kanban' ? 1 : page,
        limit: viewMode === 'kanban' ? 100 : 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        departmentId: departmentFilter ? parseInt(departmentFilter, 10) : undefined,
        assigneeId: myTasksOnly && user?.employeeId ? user.employeeId : undefined,
        sortBy,
        sortOrder,
      });

      setTasks(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0, limit: 15 });
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    mastersApi.getDepartments().then((res) => setDepartments(res.data || []));
  }, [activeCompanyId]);

  useEffect(() => {
    fetchTasks(pagination.page);
  }, [viewMode, statusFilter, priorityFilter, departmentFilter, myTasksOnly, sortBy, sortOrder, activeCompanyId]);

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  const handleTaskClick = (id: number) => {
    setSelectedTaskId(id);
    setIsDetailOpen(true);
  };

  const handleKanbanStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await tasksApi.updateProgress(taskId, {
        status: newStatus,
        remarks: `Status moved to ${newStatus} on Kanban board`,
      });
      fetchTasks(pagination.page);
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      await tasksApi.bulkAction(selectedIds, 'update_status', newStatus);
      setSelectedIds([]);
      fetchTasks(pagination.page);
    } catch (err) {
      console.error('Bulk status update failed:', err);
    }
  };

  const handleBulkPriorityChange = async (newPriority: string) => {
    try {
      await tasksApi.bulkAction(selectedIds, 'update_priority', newPriority);
      setSelectedIds([]);
      fetchTasks(pagination.page);
    } catch (err) {
      console.error('Bulk priority update failed:', err);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await tasksApi.bulkAction(selectedIds, 'delete', null);
      setSelectedIds([]);
      fetchTasks(pagination.page);
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  const handleDeleteSingle = (id: number) => {
    setTaskToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteSingle = async () => {
    if (!taskToDelete) return;
    try {
      await tasksApi.deleteTask(taskToDelete);
      setIsDeleteConfirmOpen(false);
      setTaskToDelete(null);
      fetchTasks(pagination.page);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Business Task Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, track, assign, and approve enterprise tasks across all departments
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List View
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>

          {hasPermission('tasks.create') && (
            <Button onClick={() => setIsFormOpen(true)} icon={<Plus className="w-4 h-4" />}>
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, task number, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar text-xs">
            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setDepartmentFilter('');
                setMyTasksOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                !statusFilter && !priorityFilter && !departmentFilter && !myTasksOnly
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Tasks
            </button>

            <button
              onClick={() => setMyTasksOnly(!myTasksOnly)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                myTasksOnly
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              👤 Assigned to Me
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'Overdue' ? '' : 'Overdue')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                statusFilter === 'Overdue'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              ⚠️ Overdue
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'In Progress' ? '' : 'In Progress')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                statusFilter === 'In Progress'
                  ? 'bg-sky-600 text-white'
                  : 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
              }`}
            >
              In Progress
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'Waiting for Approval' ? '' : 'Waiting for Approval')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                statusFilter === 'Waiting for Approval'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              Approval Queue
            </button>

            <button
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`p-2 rounded-lg border transition ${
                isFilterDrawerOpen || priorityFilter || departmentFilter
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
              title="More Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Filters Drawer */}
        {isFilterDrawerOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150 text-xs">
            <Select
              label="Department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.DepartmentID} value={d.DepartmentID}>
                  {d.DepartmentName}
                </option>
              ))}
            </Select>

            <Select
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>

            <div className="flex items-end justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                  setDepartmentFilter('');
                  setMyTasksOnly(false);
                  setIsFilterDrawerOpen(false);
                }}
              >
                Reset All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main View: List or Kanban */}
      {viewMode === 'list' ? (
        <TaskListView
          tasks={tasks}
          departments={departments}
          pagination={pagination}
          onPageChange={(p) => fetchTasks(p)}
          onTaskClick={handleTaskClick}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onDeleteTask={handleDeleteSingle}
        />
      ) : (
        <KanbanBoard
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleKanbanStatusChange}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onStatusChange={handleBulkStatusChange}
        onPriorityChange={handleBulkPriorityChange}
        onDelete={handleBulkDelete}
        onExport={() => {}}
      />

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTaskId(null);
          }}
          onTaskUpdated={() => fetchTasks(pagination.page)}
        />
      )}

      {/* Create Task Modal */}
      {isFormOpen && (
        <TaskFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onTaskCreated={() => fetchTasks(1)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={confirmDeleteSingle}
          title="Delete Business Task"
          message="Are you sure you want to delete this task? This action will archive the task and preserve activity history."
          confirmText="Delete Task"
          variant="danger"
        />
      )}
    </div>
  );
};
