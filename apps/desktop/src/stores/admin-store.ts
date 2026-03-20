'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface AdminStats {
  totalUsers: number;
  totalWorkspaces: number;
  totalTodos: number;
  totalThreads: number;
  activeUsers: number;
  todosByStatus: Record<string, number>;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  _count: {
    todosCreated: number;
    todosAssigned: number;
    workspaceMembers: number;
  };
}

interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  description?: string;
  createdAt: string;
  _count: {
    members: number;
    todos: number;
    teams: number;
  };
}

interface AdminTodo {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  creator: { id: string; name: string; email: string };
  assignee: { id: string; name: string; email: string };
  workspace: { id: string; name: string };
  _count: { threadLinks: number };
}

interface AdminActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string };
  workspace: { id: string; name: string };
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AdminState {
  stats: AdminStats | null;
  users: PaginatedResponse<AdminUser> | null;
  workspaces: PaginatedResponse<AdminWorkspace> | null;
  todos: PaginatedResponse<AdminTodo> | null;
  activities: PaginatedResponse<AdminActivity> | null;
  isLoading: boolean;

  fetchStats: () => Promise<void>;
  fetchUsers: (params?: Record<string, string | number>) => Promise<void>;
  fetchWorkspaces: (params?: Record<string, string | number>) => Promise<void>;
  fetchTodos: (params?: Record<string, string | number>) => Promise<void>;
  fetchActivities: (params?: Record<string, string | number>) => Promise<void>;
  updateUser: (id: string, data: Record<string, string>) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  users: null,
  workspaces: null,
  todos: null,
  activities: null,
  isLoading: false,

  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/admin/stats');
      set({ stats: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUsers: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/admin/users', { params });
      set({ users: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkspaces: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/admin/workspaces', { params });
      set({ workspaces: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTodos: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/admin/todos', { params });
      set({ todos: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchActivities: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/admin/activities', { params });
      set({ activities: data });
    } finally {
      set({ isLoading: false });
    }
  },

  updateUser: async (id, data) => {
    await api.patch(`/admin/users/${id}`, data);
  },
}));
