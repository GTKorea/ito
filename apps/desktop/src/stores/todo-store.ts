'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';

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

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  fetchTodos: (workspaceId: string, assignedToMe?: boolean) => Promise<void>;
  createTodo: (workspaceId: string, title: string, description?: string, priority?: string, dueDate?: string) => Promise<Todo>;
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  connectThread: (todoId: string, toUserId: string, message?: string) => Promise<void>;
  resolveThread: (threadLinkId: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
  isLoading: false,

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

  connectThread: async (todoId, toUserId, message) => {
    await api.post(`/todos/${todoId}/connect`, { toUserId, message });
    // Remove the todo from local state (it's now assigned to someone else)
    set((state) => ({ todos: state.todos.filter((t) => t.id !== todoId) }));
  },

  resolveThread: async (threadLinkId) => {
    await api.post(`/thread-links/${threadLinkId}/resolve`);
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
}));
