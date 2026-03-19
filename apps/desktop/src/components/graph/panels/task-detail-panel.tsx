'use client';

import { useMemo } from 'react';
import { X, Link2, CheckCircle2, Circle, Clock, AlertCircle, Ban } from 'lucide-react';
import { useGraphStore, type TaskGraphTodo } from '../task-graph-store';
import { useAuthStore } from '@/stores/auth-store';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  OPEN: { label: 'Open', icon: Circle, color: '#666' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, color: '#3B82F6' },
  BLOCKED: { label: 'Blocked', icon: AlertCircle, color: '#EF4444' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: '#22C55E' },
  CANCELLED: { label: 'Cancelled', icon: Ban, color: '#666' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT: { label: 'Urgent', color: '#EF4444' },
  HIGH: { label: 'High', color: '#F97316' },
  MEDIUM: { label: 'Medium', color: '#3B82F6' },
  LOW: { label: 'Low', color: '#9CA3AF' },
};

const LINK_STATUS_COLORS: Record<string, string> = {
  PENDING: '#EAB308',
  FORWARDED: '#3B82F6',
  COMPLETED: '#22C55E',
  CANCELLED: '#EF4444',
};

export function TaskDetailPanel() {
  const { selectedTodoId, selectTodo, todos, fetchGraphData } = useGraphStore();
  const { user } = useAuthStore();
  const { resolveThread, updateTodo } = useTodoStore();
  const { currentWorkspace } = useWorkspaceStore();

  const todo = useMemo(
    () => todos.find((t) => t.id === selectedTodoId) || null,
    [todos, selectedTodoId],
  );

  if (!selectedTodoId || !todo) return null;

  const statusConf = STATUS_CONFIG[todo.status] || STATUS_CONFIG.OPEN;
  const priorityConf = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.MEDIUM;
  const StatusIcon = statusConf.icon;

  // Find pending link for current user
  const myPendingLink = todo.threadLinks.find(
    (l) => l.toUserId === user?.id && l.status === 'PENDING',
  );

  const handleResolve = async () => {
    if (!myPendingLink || !currentWorkspace) return;
    try {
      await resolveThread(myPendingLink.id);
      await fetchGraphData(currentWorkspace.id);
    } catch {
      // ignore
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentWorkspace) return;
    try {
      await updateTodo(todo.id, { status: newStatus } as any);
      await fetchGraphData(currentWorkspace.id);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed right-0 top-0 z-50 flex h-screen w-[380px] flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Task Detail</h3>
        <button
          onClick={() => selectTodo(null)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title */}
        <div>
          <h2 className="text-base font-semibold text-foreground">{todo.title}</h2>
          {todo.description && (
            <p className="mt-1 text-sm text-muted-foreground">{todo.description}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
              const Icon = conf.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                    todo.status === key
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border text-muted-foreground hover:border-accent'
                  }`}
                >
                  <Icon className="h-3 w-3" style={{ color: conf.color }} />
                  {conf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Priority</span>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: priorityConf.color }}
            />
            <span className="text-sm text-foreground">{priorityConf.label}</span>
          </div>
        </div>

        {/* Due Date */}
        {todo.dueDate && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Due Date</span>
            <span className="block text-sm text-foreground">
              {new Date(todo.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Assignee */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Assignee</span>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {todo.assignee.name?.charAt(0).toUpperCase() || '?'}
            </span>
            <span className="text-sm text-foreground">{todo.assignee.name}</span>
          </div>
        </div>

        {/* Creator */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Creator</span>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              {todo.creator.name?.charAt(0).toUpperCase() || '?'}
            </span>
            <span className="text-sm text-foreground">{todo.creator.name}</span>
          </div>
        </div>

        {/* Thread chain */}
        {todo.threadLinks.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Thread Chain</span>
            <div className="space-y-1.5">
              {todo.threadLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-2 rounded-md border border-border p-2"
                >
                  <Link2
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: LINK_STATUS_COLORS[link.status] || '#666' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-medium text-foreground truncate">
                        {link.fromUser.name}
                      </span>
                      <span className="text-muted-foreground">&rarr;</span>
                      <span className="font-medium text-foreground truncate">
                        {link.toUser.name}
                      </span>
                    </div>
                    {link.message && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                        {link.message}
                      </p>
                    )}
                  </div>
                  <span
                    className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white"
                    style={{ backgroundColor: LINK_STATUS_COLORS[link.status] || '#666' }}
                  >
                    {link.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {myPendingLink && (
            <button
              onClick={handleResolve}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Resolve Thread
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
