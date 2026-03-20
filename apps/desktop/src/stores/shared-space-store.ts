'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  _count?: { members: number };
}

interface SharedSpaceParticipant {
  id: string;
  sharedSpaceId: string;
  workspaceId: string;
  role: string;
  joinedAt: string;
  workspace: WorkspaceSummary;
}

interface SharedSpace {
  id: string;
  name: string;
  description?: string;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
  participants: SharedSpaceParticipant[];
  _count?: { todos: number; participants: number };
}

interface SharedSpaceTodo {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  creator: User;
  assignee: User;
  workspace: { id: string; name: string; slug: string };
  threadLinks: any[];
  createdAt: string;
}

interface SharedSpaceState {
  sharedSpaces: SharedSpace[];
  currentSharedSpace: SharedSpace | null;
  todos: SharedSpaceTodo[];
  isLoading: boolean;
  todosLoading: boolean;
  fetchSharedSpaces: () => Promise<void>;
  fetchSharedSpace: (id: string) => Promise<void>;
  fetchTodos: (sharedSpaceId: string) => Promise<void>;
  createSharedSpace: (name: string, description?: string) => Promise<SharedSpace>;
  updateSharedSpace: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  inviteWorkspace: (sharedSpaceId: string, workspaceSlug: string) => Promise<{ inviteLink: string }>;
  acceptInvite: (token: string) => Promise<void>;
  createTodo: (sharedSpaceId: string, title: string, description?: string, priority?: string, dueDate?: string) => Promise<SharedSpaceTodo>;
  removeParticipant: (sharedSpaceId: string, workspaceId: string) => Promise<void>;
  setCurrentSharedSpace: (space: SharedSpace | null) => void;
}

export const useSharedSpaceStore = create<SharedSpaceState>((set, get) => ({
  sharedSpaces: [],
  currentSharedSpace: null,
  todos: [],
  isLoading: false,
  todosLoading: false,

  fetchSharedSpaces: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/shared-spaces');
      set({ sharedSpaces: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSharedSpace: async (id: string) => {
    try {
      const { data } = await api.get(`/shared-spaces/${id}`);
      set({ currentSharedSpace: data });
    } catch {
      // ignore
    }
  },

  fetchTodos: async (sharedSpaceId: string) => {
    set({ todosLoading: true });
    try {
      const { data } = await api.get(`/shared-spaces/${sharedSpaceId}/todos`);
      set({ todos: data, todosLoading: false });
    } catch {
      set({ todosLoading: false });
    }
  },

  createSharedSpace: async (name, description) => {
    const { data } = await api.post('/shared-spaces', { name, description });
    set((state) => ({ sharedSpaces: [data, ...state.sharedSpaces] }));
    return data;
  },

  updateSharedSpace: async (id, updateData) => {
    const { data } = await api.patch(`/shared-spaces/${id}`, updateData);
    set((state) => ({
      sharedSpaces: state.sharedSpaces.map((s) => (s.id === id ? data : s)),
      currentSharedSpace: state.currentSharedSpace?.id === id ? data : state.currentSharedSpace,
    }));
  },

  inviteWorkspace: async (sharedSpaceId, workspaceSlug) => {
    const { data } = await api.post(`/shared-spaces/${sharedSpaceId}/invite`, {
      workspaceSlug,
    });
    return data;
  },

  acceptInvite: async (token) => {
    await api.post(`/shared-spaces/join/${token}`);
    // Refresh the list
    await get().fetchSharedSpaces();
  },

  createTodo: async (sharedSpaceId, title, description, priority, dueDate) => {
    const { data } = await api.post(`/shared-spaces/${sharedSpaceId}/todos`, {
      title,
      description,
      priority,
      dueDate,
    });
    set((state) => ({ todos: [data, ...state.todos] }));
    return data;
  },

  removeParticipant: async (sharedSpaceId, workspaceId) => {
    await api.delete(`/shared-spaces/${sharedSpaceId}/participants/${workspaceId}`);
    // Refresh
    await get().fetchSharedSpace(sharedSpaceId);
  },

  setCurrentSharedSpace: (space) => {
    set({ currentSharedSpace: space });
  },
}));
