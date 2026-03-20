'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { trackEvent } from '@/lib/analytics';

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
  todos: Todo[];
  isLoading: boolean;
  calendarData: CalendarData | null;
  calendarLoading: boolean;
  calendarEvents: CalendarEvent[];
  calendarEventsLoading: boolean;
  fetchTodos: (workspaceId: string, assignedToMe?: boolean) => Promise<void>;
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

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
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

  fetchTodos: async (workspaceId, assignedToMe = true) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/todos`, {
        params: { assignedToMe: String(assignedToMe) },
      });
      set({ todos: data, isLoading: false });
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
    set((state) => ({ todos: [data, ...state.todos] }));
    trackEvent('task_created', { workspaceId });
    return data;
  },

  updateTodo: async (id, updateData) => {
    const { data } = await api.patch(`/todos/${id}`, updateData);
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? data : t)),
    }));
  },

  deleteTodo: async (id) => {
    await api.delete(`/todos/${id}`);
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }));
  },

  connectChain: async (todoId: string, userIds: string[]) => {
    const res = await api.post(`/todos/${todoId}/connect-chain`, { userIds });
    // Remove the todo from local state (assignee changed)
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== todoId),
    }));
    return res.data;
  },

  connectThread: async (todoId, toUserId, message) => {
    await api.post(`/todos/${todoId}/connect`, { toUserId, message });
    // Remove the todo from local state (it's now assigned to someone else)
    set((state) => ({ todos: state.todos.filter((t) => t.id !== todoId) }));
    trackEvent('thread_connected');
  },

  connectMultiThread: async (todoId, toUserIds, message) => {
    await api.post(`/todos/${todoId}/connect`, { toUserIds, message });
    // For multi-connect, the assignee stays the same (sender waits for all)
    // but we still refresh to reflect new thread links
    set((state) => ({
      todos: toUserIds.length === 1
        ? state.todos.filter((t) => t.id !== todoId)
        : state.todos,
    }));
    trackEvent('thread_connected');
  },

  resolveThread: async (threadLinkId) => {
    await api.post(`/thread-links/${threadLinkId}/resolve`);
    trackEvent('thread_resolved');
    // Remove the resolved todo from local state (it snapped back to sender)
    set((state) => ({
      todos: state.todos.map((t) => ({
        ...t,
        threadLinks: t.threadLinks.map((l) =>
          l.id === threadLinkId ? { ...l, status: 'COMPLETED' } : l,
        ),
      })).filter((t) => {
        // Remove if the resolved link belonged to this todo and we're no longer assignee
        const resolvedLink = t.threadLinks.find((l) => l.id === threadLinkId);
        return !resolvedLink;
      }),
    }));
  },

  declineThread: async (threadLinkId, reason) => {
    await api.post(`/thread-links/${threadLinkId}/decline`, { reason });
    trackEvent('thread_declined');
    // Remove the declined todo from local state (it snapped back to sender)
    set((state) => ({
      todos: state.todos.map((t) => ({
        ...t,
        threadLinks: t.threadLinks.map((l) =>
          l.id === threadLinkId ? { ...l, status: 'CANCELLED' } : l,
        ),
      })).filter((t) => {
        const declinedLink = t.threadLinks.find((l) => l.id === threadLinkId);
        return !declinedLink;
      }),
    }));
  },
}));
