'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { trackEvent } from '@/lib/analytics';
import { useWorkspaceStore } from './workspace-store';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ThreadLink {
  id: string;
  fromUser: User;
  toUser: User;
  message?: string;
  status: string;
  chainIndex: number;
  groupId?: string;
  createdAt: string;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  creator: User;
  assignee: User;
  threadLinks: ThreadLink[];
  createdAt: string;
}

interface CalendarTodo {
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
  completed: CalendarTodo[];
  upcoming: CalendarTodo[];
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

interface TodoState {
  actionRequired: Todo[];
  waiting: Todo[];
  completed: Todo[];
  isLoading: boolean;
  calendarData: CalendarData | null;
  calendarLoading: boolean;
  calendarEvents: CalendarEvent[];
  calendarEventsLoading: boolean;
  fetchCategorizedTodos: (workspaceId: string) => Promise<void>;
  fetchCalendarTodos: (workspaceId: string, start: string, end: string) => Promise<void>;
  fetchCalendarEvents: (start: string, end: string) => Promise<void>;
  createTodo: (workspaceId: string, title: string, description?: string, priority?: string, dueDate?: string) => Promise<Todo>;
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  connectChain: (todoId: string, userIds: string[]) => Promise<any>;
  connectThread: (todoId: string, toUserId: string, message?: string) => Promise<void>;
  connectMultiThread: (todoId: string, toUserIds: string[], message?: string) => Promise<void>;
  resolveThread: (threadLinkId: string) => Promise<void>;
  declineThread: (threadLinkId: string, reason?: string) => Promise<void>;
}

function getWorkspaceId(): string | undefined {
  return useWorkspaceStore.getState().currentWorkspace?.id;
}

async function refetchCategorized(set: (partial: Partial<TodoState>) => void) {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return;
  try {
    const { data } = await api.get(`/workspaces/${workspaceId}/todos/categorized`);
    set({
      actionRequired: data.actionRequired,
      waiting: data.waiting,
      completed: data.completed,
    });
  } catch {
    // silent fail on refetch
  }
}

export const useTodoStore = create<TodoState>((set) => ({
  actionRequired: [],
  waiting: [],
  completed: [],
  isLoading: false,
  calendarData: null,
  calendarLoading: false,
  calendarEvents: [],
  calendarEventsLoading: false,

  fetchCalendarTodos: async (workspaceId, start, end) => {
    set({ calendarLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/todos/calendar`, {
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

  fetchCategorizedTodos: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/todos/categorized`);
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

  createTodo: async (workspaceId, title, description, priority, dueDate) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/todos`, {
      title,
      description,
      priority,
      dueDate,
    });
    set((state) => ({ actionRequired: [data, ...state.actionRequired] }));
    trackEvent('task_created', { workspaceId });
    return data;
  },

  updateTodo: async (id, updateData) => {
    const { data } = await api.patch(`/todos/${id}`, updateData);
    const updateInList = (list: Todo[]) =>
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

  deleteTodo: async (id) => {
    await api.delete(`/todos/${id}`);
    set((state) => ({
      actionRequired: state.actionRequired.filter((t) => t.id !== id),
      waiting: state.waiting.filter((t) => t.id !== id),
      completed: state.completed.filter((t) => t.id !== id),
    }));
  },

  connectChain: async (todoId: string, userIds: string[]) => {
    const res = await api.post(`/todos/${todoId}/connect-chain`, { userIds });
    // Move from actionRequired to waiting
    set((state) => {
      const todo = state.actionRequired.find((t) => t.id === todoId);
      return {
        actionRequired: state.actionRequired.filter((t) => t.id !== todoId),
        waiting: todo ? [...state.waiting, { ...todo, ...res.data }] : state.waiting,
      };
    });
    return res.data;
  },

  connectThread: async (todoId, toUserId, message) => {
    const { data } = await api.post(`/todos/${todoId}/connect`, { toUserId, message });
    const updatedTodo = data.todo || data;
    // Move from actionRequired to waiting
    set((state) => {
      const todo = state.actionRequired.find((t) => t.id === todoId);
      return {
        actionRequired: state.actionRequired.filter((t) => t.id !== todoId),
        waiting: todo ? [...state.waiting, { ...todo, ...updatedTodo }] : state.waiting,
      };
    });
    trackEvent('thread_connected');
  },

  connectMultiThread: async (todoId, toUserIds, message) => {
    const { data } = await api.post(`/todos/${todoId}/connect`, { toUserIds, message });
    const updatedTodo = data.todo || data;
    set((state) => {
      if (toUserIds.length === 1) {
        // Single connect: move to waiting
        const todo = state.actionRequired.find((t) => t.id === todoId);
        return {
          actionRequired: state.actionRequired.filter((t) => t.id !== todoId),
          waiting: todo ? [...state.waiting, { ...todo, ...updatedTodo }] : state.waiting,
        };
      }
      // Multi-connect: update in place (assignee stays with sender for parallel)
      return {
        actionRequired: state.actionRequired.map((t) => t.id === todoId ? { ...t, ...updatedTodo } : t),
      };
    });
    trackEvent('thread_connected');
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
}));
