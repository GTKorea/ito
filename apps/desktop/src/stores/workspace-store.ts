'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  description?: string;
  website?: string;
  location?: string;
  _count?: { members: number };
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (ws: Workspace) => void;
  createWorkspace: (name: string, slug: string) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Pick<Workspace, 'name' | 'description' | 'website' | 'location'>>) => Promise<Workspace>;
  uploadLogo: (id: string, file: File) => Promise<void>;
  deleteWorkspace: (id: string, confirmName: string) => Promise<void>;
}

const WS_STORAGE_KEY = 'ito-workspace-id';

function getStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WS_STORAGE_KEY);
}

function storeWorkspaceId(id: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WS_STORAGE_KEY, id);
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: true,

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/workspaces');
      set({ workspaces: data, isLoading: false });
      if (data.length > 0 && !get().currentWorkspace) {
        const storedId = getStoredWorkspaceId();
        const matched = storedId ? data.find((ws: Workspace) => ws.id === storedId) : null;
        const selected = matched || data[0];
        storeWorkspaceId(selected.id);
        set({ currentWorkspace: selected });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setCurrentWorkspace: (ws) => {
    storeWorkspaceId(ws.id);
    set({ currentWorkspace: ws });
  },

  createWorkspace: async (name, slug) => {
    const { data } = await api.post('/workspaces', { name, slug });
    storeWorkspaceId(data.id);
    set((state) => ({
      workspaces: [...state.workspaces, data],
      currentWorkspace: data,
    }));
    return data;
  },

  updateWorkspace: async (id, updateData) => {
    const { data } = await api.patch(`/workspaces/${id}`, updateData);
    set((state) => ({
      workspaces: state.workspaces.map((ws) => (ws.id === id ? { ...ws, ...data } : ws)),
      currentWorkspace: state.currentWorkspace?.id === id ? { ...state.currentWorkspace, ...data } : state.currentWorkspace,
    }));
    return data;
  },

  uploadLogo: async (id, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await api.post(`/workspaces/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    set((state) => ({
      workspaces: state.workspaces.map((ws) => (ws.id === id ? { ...ws, avatarUrl: data.avatarUrl } : ws)),
      currentWorkspace: state.currentWorkspace?.id === id ? { ...state.currentWorkspace, avatarUrl: data.avatarUrl } : state.currentWorkspace,
    }));
  },

  deleteWorkspace: async (id, confirmName) => {
    await api.delete(`/workspaces/${id}`, { data: { confirmName } });
    const remaining = get().workspaces.filter((ws) => ws.id !== id);
    const next = remaining[0] || null;
    if (next) storeWorkspaceId(next.id);
    set({ workspaces: remaining, currentWorkspace: next });
  },
}));
