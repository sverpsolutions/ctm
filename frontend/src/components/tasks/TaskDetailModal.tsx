import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Building,
  Building2,
  Tag,
  CheckSquare,
  MessageSquare,
  Paperclip,
  History,
  CheckCircle2,
  XCircle,
  Upload,
  Send,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { TaskItem } from '../../types';
import { tasksApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TaskDetailModalProps {
  taskId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
}) => {
  const { user, hasPermission } = useAuth();
  const [task, setTask] = useState<TaskItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'updates' | 'comments' | 'attachments' | 'activity'>('overview');

  // Form states for updates, comments, attachments, rejection
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('In Progress');
  const [progressRemarks, setProgressRemarks] = useState<string>('');
  const [timeSpent, setTimeSpent] = useState<string>('1.0');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  const [commentText, setCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      setIsLoading(true);
      const res = await tasksApi.getTaskById(taskId);
      setTask(res.data);
      setProgressPercent(res.data.PercentageComplete || 0);
      setProgressStatus(res.data.Status);
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId]);

  const handleToggleChecklist = async (checklistItemId: number, currentCompleted: boolean | number) => {
    if (!task) return;
    try {
      const updatedStatus = !currentCompleted;
      const updatedChecklist = (task.checklist || []).map((item) =>
        item.ChecklistItemID === checklistItemId ? { ...item, IsCompleted: updatedStatus } : item
      );

      const totalItems = updatedChecklist.length;
      const completedItems = updatedChecklist.filter((i) => i.IsCompleted).length;
      const calcProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : task.PercentageComplete;

      await tasksApi.updateProgress(task.TaskID, {
        status: calcProgress === 100 && task.RequiresApproval ? 'Waiting for Approval' : calcProgress === 100 ? 'Completed' : task.Status,
        percentageComplete: calcProgress,
        remarks: `Checklist item updated (${completedItems}/${totalItems} complete)`,
        checklistUpdates: [{ checklistItemId, isCompleted: updatedStatus }],
      });

      fetchTaskDetails();
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to update checklist item:', err);
    }
  };

  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !progressRemarks.trim()) return;

    try {
      setIsSubmittingProgress(true);
      await tasksApi.updateProgress(task.TaskID, {
        status: progressStatus,
        percentageComplete: progressPercent,
        timeSpentHours: parseFloat(timeSpent) || 0,
        remarks: progressRemarks.trim(),
      });
      setProgressRemarks('');
      fetchTaskDetails();
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to record progress update:', err);
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      await tasksApi.addComment(task.TaskID, commentText.trim());
      setCommentText('');
      fetchTaskDetails();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !uploadFile) return;

    try {
      setIsUploading(true);
      await tasksApi.uploadAttachment(task.TaskID, uploadFile);
      setUploadFile(null);
      fetchTaskDetails();
      onTaskUpdated();
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApprove = async () => {
    if (!task) return;
    try {
      await tasksApi.approveTask(task.TaskID);
      fetchTaskDetails();
      onTaskUpdated();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleReject = async () => {
    if (!task || !rejectReason.trim()) return;
    try {
      await tasksApi.rejectTask(task.TaskID, rejectReason.trim());
      setShowRejectModal(false);
      setRejectReason('');
      fetchTaskDetails();
      onTaskUpdated();
    } catch (err) {
      console.error('Rejection failed:', err);
    }
  };

  if (!isOpen || !taskId) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      {isLoading || !task ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-medium">Loading task workflow...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900">
                  {task.TaskNumber}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700" title={task.CompanyName}>
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  {task.CompanyName || task.CompanyCode || 'Company'}
                </span>
                <Badge
                  variant={
                    task.EffectiveStatus === 'Completed'
                      ? 'success'
                      : task.EffectiveStatus === 'Overdue'
                      ? 'danger'
                      : task.EffectiveStatus === 'Waiting for Approval'
                      ? 'warning'
                      : 'primary'
                  }
                >
                  {task.EffectiveStatus}
                </Badge>
                <Badge
                  variant={
                    task.Priority === 'Critical'
                      ? 'danger'
                      : task.Priority === 'High'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  Priority: {task.Priority}
                </Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {task.TaskTitle}
              </h2>
            </div>

            {/* Manager Review Controls */}
            {task.EffectiveStatus === 'Waiting for Approval' && hasPermission('tasks.approve') && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex-shrink-0">
                <Button variant="success" size="sm" onClick={handleApprove} icon={<CheckCircle2 className="w-4 h-4" />}>
                  Approve Task
                </Button>
                <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)} icon={<XCircle className="w-4 h-4" />}>
                  Reject
                </Button>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-semibold overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
              {
                id: 'checklist',
                label: `Checklist (${task.checklist?.filter((c) => c.IsCompleted).length || 0}/${task.checklist?.length || 0})`,
                icon: <CheckSquare className="w-4 h-4" />,
              },
              {
                id: 'updates',
                label: `Progress Updates (${task.updates?.length || 0})`,
                icon: <Percent className="w-4 h-4" />,
              },
              {
                id: 'comments',
                label: `Comments (${task.comments?.length || 0})`,
                icon: <MessageSquare className="w-4 h-4" />,
              },
              {
                id: 'attachments',
                label: `Documents (${task.attachments?.length || 0})`,
                icon: <Paperclip className="w-4 h-4" />,
              },
              { id: 'activity', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 pb-3 border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description
                  </h4>
                  <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed whitespace-pre-line">
                    {task.TaskDescription || 'No description provided.'}
                  </div>
                </div>

                {/* Related Links */}
                {(task.RelatedDateTitle || task.RelatedVendor || task.RelatedCustomer) && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Related Context
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {task.RelatedDateTitle && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 rounded-xl">
                          <span className="text-purple-600 dark:text-purple-400 font-semibold block">
                            📌 Important Date
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {task.RelatedDateTitle}
                          </span>
                        </div>
                      )}
                      {task.RelatedVendor && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                          <span className="text-slate-500 font-semibold block">🏢 Vendor</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {task.RelatedVendor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Info */}
              <div className="space-y-4 bg-slate-50/70 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Company</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    {task.CompanyName || task.CompanyCode || 'Primary Company'}
                  </div>
                </div>

                {task.TaskType && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Task Type</span>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {task.TaskType}
                    </div>
                  </div>
                )}

                {task.StartDate && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Start Date</span>
                    <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(task.StartDate).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Due Date</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    {new Date(task.DueDate).toLocaleDateString()}
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({task.DaysRemaining !== undefined ? (task.DaysRemaining < 0 ? `${Math.abs(task.DaysRemaining)}d late` : `${task.DaysRemaining}d left`) : ''})
                    </span>
                  </div>
                </div>

                {task.ReminderDate && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Reminder Date</span>
                    <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4 text-amber-500" />
                      {new Date(task.ReminderDate).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {task.Remarks && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Remarks</span>
                    <div className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap">
                      {task.Remarks}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Department</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                    <Building className="w-4 h-4 text-slate-400" />
                    {task.DepartmentName || 'General'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Assignees</span>
                  <div className="space-y-1 mt-1">
                    {(task.assignees || []).map((emp) => (
                      <div key={emp.EmployeeID} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center">
                          {emp.EmployeeName.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {emp.EmployeeName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Progress</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${task.PercentageComplete || 0}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {task.PercentageComplete || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Checklist */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Task Checklist Items</span>
                <span>
                  Completed: {task.checklist?.filter((c) => c.IsCompleted).length || 0} /{' '}
                  {task.checklist?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {(task.checklist || []).map((item) => (
                  <label
                    key={item.ChecklistItemID}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(item.IsCompleted)}
                      onChange={() => handleToggleChecklist(item.ChecklistItemID, item.IsCompleted)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span
                      className={`text-xs font-medium ${
                        item.IsCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.Title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Updates & Progress Log */}
          {activeTab === 'updates' && (
            <div className="space-y-6">
              {/* Add Progress Update Form */}
              <form
                onSubmit={handleSubmitProgress}
                className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Log Progress Update
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    label="Status"
                    value={progressStatus}
                    onChange={(e) => setProgressStatus(e.target.value)}
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Waiting for Approval">Waiting for Approval</option>
                    <option value="Completed">Completed</option>
                  </Select>

                  <Input
                    label="Progress % (0 - 100)"
                    type="number"
                    min="0"
                    max="100"
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(parseInt(e.target.value, 10) || 0)}
                  />

                  <Input
                    label="Hours Spent"
                    type="number"
                    step="0.5"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(e.target.value)}
                  />
                </div>

                <Input
                  label="Remarks & Progress Notes"
                  placeholder="e.g. Server snapshot restored, verified checksums..."
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  required
                />

                <div className="flex justify-end">
                  <Button type="submit" size="sm" isLoading={isSubmittingProgress}>
                    Save Update
                  </Button>
                </div>
              </form>

              {/* Updates Timeline List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Historical Updates
                </h4>
                {(task.updates || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No progress logs recorded yet.</p>
                ) : (
                  (task.updates || []).map((u) => (
                    <div
                      key={u.UpdateID}
                      className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {u.EmployeeName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(u.CreatedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold text-[10px]">
                          {u.NewStatus} ({u.NewProgress}%)
                        </span>
                        {u.TimeSpentHours ? (
                          <span className="text-slate-400 text-[11px]">
                            • Time: {u.TimeSpentHours} hrs
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{u.Remarks}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Comments */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                {(task.comments || []).length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No comments yet. Start the conversation below.
                  </div>
                ) : (
                  (task.comments || []).map((c) => (
                    <div
                      key={c.CommentID}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {c.EmployeeName || c.Username}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{c.CommentText}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  placeholder="Write a comment or mention @team..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" isLoading={isSubmittingComment} icon={<Send className="w-4 h-4" />}>
                  Post
                </Button>
              </form>
            </div>
          )}

          {/* Tab 5: Attachments */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              {/* Upload Dropzone Form */}
              <form onSubmit={handleFileUpload} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <Button type="submit" size="sm" disabled={!uploadFile} isLoading={isUploading} icon={<Upload className="w-3.5 h-3.5" />}>
                  Upload File
                </Button>
              </form>

              {/* Attachment List */}
              <div className="space-y-2">
                {(task.attachments || []).map((att) => (
                  <div
                    key={att.AttachmentID}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                          {att.OriginalName || att.FileName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {(att.FileSize / 1024).toFixed(1)} KB • Uploaded by {att.UploadedByUsername}
                        </span>
                      </div>
                    </div>
                    <a
                      href={att.StoragePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline font-semibold"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Activity Log */}
          {activeTab === 'activity' && (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {(task.activities || []).map((act) => (
                <div
                  key={act.ActivityID}
                  className="flex items-start gap-3 p-2.5 text-xs border-b border-slate-100 dark:border-slate-800/60"
                >
                  <History className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">
                      {act.Username}:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">{act.Description}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(act.CreatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} size="sm" title="Reject Task">
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Please enter the required corrections or rejection feedback:
            </p>
            <Input
              label="Rejection Reason"
              placeholder="e.g. Please verify store 3 backup log before sign-off..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim()}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
