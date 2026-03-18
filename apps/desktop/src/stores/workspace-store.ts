'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  _count?: { members: number };
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (ws: Workspace) => void;
  createWorkspace: (name: string, slug: string) => Promise<Workspace>;
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
        set({ currentWorkspace: data[0] });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),

  createWorkspace: async (name, slug) => {
    const { data } = await api.post('/workspaces', { name, slug });
    set((state) => ({
      workspaces: [...state.workspaces, data],
      currentWorkspace: data,
    }));
    return data;
  },
}));
