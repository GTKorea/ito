'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { trackEvent } from '@/lib/analytics';
import { useWorkspaceStore } from './workspace-store';
import { useTaskGroupStore } from './task-group-store';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ThreadLink {
  id: string;
  fromUser: User;
  toUser: User | null;
  type: 'PERSON' | 'BLOCKER';
  blockerNote?: string;
  message?: string;
  status: string;
  chainIndex: number;
  groupId?: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  order?: number;
  type?: string;
  voteConfig?: any;
  creator: User;
  assignee: User;
  threadLinks: ThreadLink[];
  createdAt: string;
}

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  creator: User;
  assignee: User;
}

interface CalendarData {
  completed: CalendarTask[];
  upcoming: CalendarTask[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink: string;
  source: 'google' | 'outlook';
}

interface TaskState {
  actionRequired: Task[];
  waiting: Task[];
  completed: Task[];
  isLoading: boolean;
  calendarData: CalendarData | null;
  calendarLoading: boolean;
  calendarEvents: CalendarEvent[];
  calendarEventsLoading: boolean;
  fetchCategorizedTasks: (workspaceId: string, taskGroupId?: string) => Promise<void>;
  fetchCalendarTasks: (workspaceId: string, start: string, end: string) => Promise<void>;
  fetchCalendarEvents: (start: string, end: string) => Promise<void>;
  createTask: (workspaceId: string, title: string, description?: string, priority?: string, dueDate?: string, taskGroupId?: string, type?: string, voteConfig?: any) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  connectChain: (taskId: string, userIds: string[]) => Promise<any>;
  connectThread: (taskId: string, toUserId: string, message?: string) => Promise<void>;
  connectMultiThread: (taskId: string, toUserIds: string[], message?: string) => Promise<void>;
  connectBlocker: (taskId: string, blockerNote: string) => Promise<void>;
  resolveBlocker: (threadLinkId: string) => Promise<void>;
  resolveThread: (threadLinkId: string) => Promise<void>;
  declineThread: (threadLinkId: string, reason?: string) => Promise<void>;
  reorderTasks: (workspaceId: string, taskIds: string[]) => Promise<void>;
  silentRefetch: (workspaceId: string, taskGroupId?: string) => Promise<void>;
  batchMoveCheck: (taskIds: string[], workspaceId?: string, taskGroupId?: string) => Promise<{ movable: Task[]; blocked: { task: Task; reason: string }[] }>;
  batchMoveExecute: (taskIds: string[], workspaceId?: string, taskGroupId?: string) => Promise<void>;
}

function getWorkspaceId(): string | undefined {
  return useWorkspaceStore.getState().currentWorkspace?.id;
}

/** Move a task from actionRequired to waiting (used by connect operations) */
function moveToWaiting(state: Pick<TaskState, 'actionRequired' | 'waiting'>, taskId: string, updatedData?: Partial<Task>) {
  const task = state.actionRequired.find((t) => t.id === taskId);
  return {
    actionRequired: state.actionRequired.filter((t) => t.id !== taskId),
    waiting: task ? [...state.waiting, { ...task, ...updatedData }] : state.waiting,
  };
}

async function refetchCategorized(set: (partial: Partial<TaskState>) => void) {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return;
  try {
    const { data } = await api.get(`/workspaces/${workspaceId}/tasks/categorized`);
    set({
      actionRequired: data.actionRequired,
      waiting: data.waiting,
      completed: data.completed,
    });
  } catch {
    // silent fail on refetch
  }
}

export const useTaskStore = create<TaskState>((set) => ({
  actionRequired: [],
  waiting: [],
  completed: [],
  isLoading: false,
  calendarData: null,
  calendarLoading: false,
  calendarEvents: [],
  calendarEventsLoading: false,

  fetchCalendarTasks: async (workspaceId, start, end) => {
    set({ calendarLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/tasks/calendar`, {
        params: { start, end },
      });
      set({ calendarData: data, calendarLoading: false });
    } catch {
      set({ calendarLoading: false });
    }
  },

  fetchCalendarEvents: async (start, end) => {
    set({ calendarEventsLoading: true });
    try {
      const { data } = await api.get('/calendar/events', { params: { start, end } });
      set({ calendarEvents: data, calendarEventsLoading: false });
    } catch {
      set({ calendarEvents: [], calendarEventsLoading: false });
    }
  },

  fetchCategorizedTasks: async (workspaceId, taskGroupId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/tasks/categorized`, {
        params: taskGroupId ? { taskGroupId } : undefined,
      });
      set({
        actionRequired: data.actionRequired,
        waiting: data.waiting,
        completed: data.completed,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  silentRefetch: async (workspaceId, taskGroupId) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/tasks/categorized`, {
        params: taskGroupId ? { taskGroupId } : undefined,
      });
      set({
        actionRequired: data.actionRequired,
        waiting: data.waiting,
        completed: data.completed,
      });
    } catch {
      // silent fail
    }
  },

  createTask: async (workspaceId, title, description, priority, dueDate, taskGroupId, type, voteConfig) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/tasks`, {
      title,
      description,
      priority,
      dueDate,
      taskGroupId,
      ...(type ? { type } : {}),
      ...(voteConfig ? { voteConfig } : {}),
    });
    set((state) => ({ actionRequired: [data, ...state.actionRequired] }));
    // Optimistic update: increment group task count in sidebar
    if (taskGroupId) {
      const groupStore = useTaskGroupStore.getState();
      useTaskGroupStore.setState({
        groups: groupStore.groups.map((g) =>
          g.id === taskGroupId ? { ...g, _count: { ...g._count, tasks: g._count.tasks + 1 } } : g
        ),
        sharedSpaceGroups: Object.fromEntries(
          Object.entries(groupStore.sharedSpaceGroups).map(([spaceId, groups]) => [
            spaceId,
            groups.map((g) =>
              g.id === taskGroupId ? { ...g, _count: { ...g._count, tasks: g._count.tasks + 1 } } : g
            ),
          ])
        ),
      });
    }
    trackEvent('task_created', { workspaceId });
    return data;
  },

  updateTask: async (id, updateData) => {
    const { data } = await api.patch(`/tasks/${id}`, updateData);
    const updateInList = (list: Task[]) =>
      list.map((t) => (t.id === id ? data : t));

    if (updateData.status === 'COMPLETED') {
      // Move to completed
      set((state) => ({
        actionRequired: state.actionRequired.filter((t) => t.id !== id),
        waiting: state.waiting.filter((t) => t.id !== id),
        completed: [data, ...state.completed],
      }));
    } else {
      set((state) => ({
        actionRequired: updateInList(state.actionRequired),
        waiting: updateInList(state.waiting),
        completed: updateInList(state.completed),
      }));
    }
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    set((state) => ({
      actionRequired: state.actionRequired.filter((t) => t.id !== id),
      waiting: state.waiting.filter((t) => t.id !== id),
      completed: state.completed.filter((t) => t.id !== id),
    }));
  },

  connectChain: async (taskId: string, userIds: string[]) => {
    const res = await api.post(`/tasks/${taskId}/connect-chain`, { userIds });
    set((state) => moveToWaiting(state, taskId, res.data));
    return res.data;
  },

  connectThread: async (taskId, toUserId, message) => {
    const { data } = await api.post(`/tasks/${taskId}/connect`, { toUserId, message });
    set((state) => moveToWaiting(state, taskId, data.task || data));
    trackEvent('thread_connected');
  },

  connectMultiThread: async (taskId, toUserIds, message) => {
    const { data } = await api.post(`/tasks/${taskId}/connect`, { toUserIds, message });
    const updatedTask = data.task || data;
    set((state) => {
      if (toUserIds.length === 1) {
        return moveToWaiting(state, taskId, updatedTask);
      }
      // Multi-connect: update in place (assignee stays with sender for parallel)
      return {
        actionRequired: state.actionRequired.map((t) => t.id === taskId ? { ...t, ...updatedTask } : t),
      };
    });
    trackEvent('thread_connected');
  },

  connectBlocker: async (taskId, blockerNote) => {
    await api.post(`/tasks/${taskId}/block`, { blockerNote });
    // Move task to waiting (blocked state)
    set((state) => {
      const task = state.actionRequired.find((t) => t.id === taskId);
      return {
        actionRequired: state.actionRequired.filter((t) => t.id !== taskId),
        waiting: task ? [...state.waiting, { ...task, status: 'BLOCKED' }] : state.waiting,
      };
    });
    trackEvent('blocker_connected');
    await refetchCategorized(set);
  },

  resolveBlocker: async (threadLinkId) => {
    await api.post(`/thread-links/${threadLinkId}/resolve-blocker`);
    trackEvent('blocker_resolved');
    await refetchCategorized(set);
  },

  resolveThread: async (threadLinkId) => {
    // Optimistic: remove from actionRequired
    set((state) => ({
      actionRequired: state.actionRequired.filter(
        (t) => !t.threadLinks.some((l) => l.id === threadLinkId),
      ),
    }));
    await api.post(`/thread-links/${threadLinkId}/resolve`);
    trackEvent('thread_resolved');
    // Refetch to get authoritative categorization (snap-back changes state for others)
    await refetchCategorized(set);
  },

  declineThread: async (threadLinkId, reason) => {
    // Optimistic: remove from actionRequired
    set((state) => ({
      actionRequired: state.actionRequired.filter(
        (t) => !t.threadLinks.some((l) => l.id === threadLinkId),
      ),
    }));
    await api.post(`/thread-links/${threadLinkId}/decline`, { reason });
    trackEvent('thread_declined');
    // Refetch to get authoritative categorization
    await refetchCategorized(set);
  },

  reorderTasks: async (workspaceId, taskIds) => {
    // Optimistic: reorder actionRequired to match taskIds
    set((state) => {
      const taskMap = new Map(state.actionRequired.map((t) => [t.id, t]));
      const reordered = taskIds
        .map((id) => taskMap.get(id))
        .filter(Boolean) as Task[];
      // Keep any tasks not in taskIds at the end
      const remaining = state.actionRequired.filter((t) => !taskIds.includes(t.id));
      return { actionRequired: [...reordered, ...remaining] };
    });
    try {
      await api.put(`/workspaces/${workspaceId}/tasks/reorder`, { taskIds });
    } catch {
      await refetchCategorized(set);
    }
  },

  batchMoveCheck: async (taskIds, workspaceId, taskGroupId) => {
    const { data } = await api.post('/tasks/batch-move/check', { taskIds, workspaceId, taskGroupId });
    return data;
  },

  batchMoveExecute: async (taskIds, workspaceId, taskGroupId) => {
    await api.post('/tasks/batch-move', { taskIds, workspaceId, taskGroupId });
    // Optimistic: remove moved tasks from all lists
    set((state) => ({
      actionRequired: state.actionRequired.filter((t) => !taskIds.includes(t.id)),
      waiting: state.waiting.filter((t) => !taskIds.includes(t.id)),
      completed: state.completed.filter((t) => !taskIds.includes(t.id)),
    }));
    trackEvent('tasks_moved', { count: taskIds.length });
    await refetchCategorized(set);
  },
}));
