'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  sharedSpaceId?: string;
  createdById: string;
  createdBy: { id: string; name: string; avatarUrl?: string };
  _count: { members: number; tasks: number };
}

interface TaskGroupState {
  groups: TaskGroup[];
  sharedSpaceGroups: Record<string, TaskGroup[]>;
  currentGroupId: string | null;
  isLoading: boolean;

  fetchGroups: (workspaceId: string) => Promise<void>;
  fetchSharedSpaceGroups: (sharedSpaceId: string) => Promise<void>;
  createGroup: (workspaceId: string, name: string, description?: string) => Promise<TaskGroup>;
  createSharedSpaceGroup: (sharedSpaceId: string, name: string, description?: string) => Promise<TaskGroup>;
  updateGroup: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, userId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  addTaskToGroup: (groupId: string, taskId: string) => Promise<void>;
  removeTaskFromGroup: (groupId: string, taskId: string) => Promise<void>;
  setCurrentGroup: (id: string | null) => void;
}

export const useTaskGroupStore = create<TaskGroupState>((set, get) => ({
  groups: [],
  sharedSpaceGroups: {},
  currentGroupId: null,
  isLoading: false,

  fetchGroups: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/task-groups`);
      set({ groups: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSharedSpaceGroups: async (sharedSpaceId) => {
    try {
      const { data } = await api.get(`/shared-spaces/${sharedSpaceId}/task-groups`);
      set((state) => ({
        sharedSpaceGroups: { ...state.sharedSpaceGroups, [sharedSpaceId]: data },
      }));
    } catch {
      // silent
    }
  },

  createGroup: async (workspaceId, name, description) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/task-groups`, { name, description });
    set((state) => ({ groups: [...state.groups, data] }));
    return data;
  },

  createSharedSpaceGroup: async (sharedSpaceId, name, description) => {
    const { data } = await api.post(`/shared-spaces/${sharedSpaceId}/task-groups`, { name, description });
    set((state) => ({
      sharedSpaceGroups: {
        ...state.sharedSpaceGroups,
        [sharedSpaceId]: [...(state.sharedSpaceGroups[sharedSpaceId] || []), data],
      },
    }));
    return data;
  },

  updateGroup: async (id, updateData) => {
    const { data } = await api.patch(`/task-groups/${id}`, updateData);
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? data : g)),
    }));
  },

  deleteGroup: async (id) => {
    await api.delete(`/task-groups/${id}`);
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      currentGroupId: state.currentGroupId === id ? null : state.currentGroupId,
    }));
  },

  addMember: async (groupId, userId) => {
    await api.post(`/task-groups/${groupId}/members`, { userId });
    // Refetch to get updated counts
    const { data } = await api.get(`/task-groups/${groupId}`);
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, _count: data._count } : g)),
    }));
  },

  removeMember: async (groupId, userId) => {
    await api.delete(`/task-groups/${groupId}/members/${userId}`);
    const { data } = await api.get(`/task-groups/${groupId}`);
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, _count: data._count } : g)),
    }));
  },

  addTaskToGroup: async (groupId, taskId) => {
    await api.post(`/task-groups/${groupId}/tasks/${taskId}`);
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, _count: { ...g._count, tasks: g._count.tasks + 1 } } : g,
      ),
    }));
  },

  removeTaskFromGroup: async (groupId, taskId) => {
    await api.delete(`/task-groups/${groupId}/tasks/${taskId}`);
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, _count: { ...g._count, tasks: Math.max(0, g._count.tasks - 1) } } : g,
      ),
    }));
  },

  setCurrentGroup: (id) => set({ currentGroupId: id }),
}));
