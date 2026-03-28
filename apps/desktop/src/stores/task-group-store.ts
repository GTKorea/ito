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
  isPrivate?: boolean;
  isSystem?: boolean;
  createdBy: { id: string; name: string; avatarUrl?: string };
  _count: { members: number; tasks: number };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  taskGroupId: string;
}

interface TaskGroupState {
  groups: TaskGroup[];
  sharedSpaceGroups: Record<string, TaskGroup[]>;
  totalActiveTaskCount: number;
  currentGroupId: string | null;
  isLoading: boolean;
  tags: Record<string, Tag[]>;

  fetchGroups: (workspaceId: string) => Promise<void>;
  fetchSharedSpaceGroups: (sharedSpaceId: string) => Promise<void>;
  fetchAllSharedSpaceGroups: (spaceIds: string[]) => Promise<void>;
  createGroup: (workspaceId: string, name: string, description?: string, isPrivate?: boolean) => Promise<TaskGroup>;
  createSharedSpaceGroup: (sharedSpaceId: string, name: string, description?: string) => Promise<TaskGroup>;
  updateGroup: (id: string, data: { name?: string; description?: string; isPrivate?: boolean }) => Promise<void>;
  inviteTeam: (groupId: string, teamId: string) => Promise<{ added: number; total: number }>;
  deleteGroup: (id: string) => Promise<void>;
  archiveGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, userId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  addTaskToGroup: (groupId: string, taskId: string) => Promise<void>;
  removeTaskFromGroup: (groupId: string, taskId: string) => Promise<void>;
  setCurrentGroup: (id: string | null) => void;
  fetchTags: (groupId: string) => Promise<void>;
  createTag: (groupId: string, name: string, color?: string) => Promise<Tag>;
  updateTag: (tagId: string, data: { name?: string; color?: string }) => Promise<void>;
  deleteTag: (tagId: string, groupId: string) => Promise<void>;
}

export const useTaskGroupStore = create<TaskGroupState>((set, get) => ({
  groups: [],
  sharedSpaceGroups: {},
  totalActiveTaskCount: 0,
  currentGroupId: null,
  isLoading: false,
  tags: {},

  fetchGroups: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/task-groups`);
      set({ groups: data.groups, totalActiveTaskCount: data.totalActiveCount, isLoading: false });
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

  fetchAllSharedSpaceGroups: async (spaceIds) => {
    await Promise.all(spaceIds.map((id) => get().fetchSharedSpaceGroups(id)));
  },

  createGroup: async (workspaceId, name, description, isPrivate) => {
    const { data } = await api.post(`/workspaces/${workspaceId}/task-groups`, { name, description, isPrivate });
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

  archiveGroup: async (id) => {
    await api.post(`/task-groups/${id}/archive`);
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

  inviteTeam: async (groupId, teamId) => {
    const { data } = await api.post(`/task-groups/${groupId}/invite-team`, { teamId });
    // Refetch to get updated member count
    const { data: group } = await api.get(`/task-groups/${groupId}`);
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, _count: group._count } : g)),
    }));
    return data;
  },

  setCurrentGroup: (id) => set({ currentGroupId: id }),

  fetchTags: async (groupId) => {
    try {
      const { data } = await api.get(`/task-groups/${groupId}/tags`);
      set((state) => ({ tags: { ...state.tags, [groupId]: data } }));
    } catch {
      // silent
    }
  },

  createTag: async (groupId, name, color) => {
    const { data } = await api.post(`/task-groups/${groupId}/tags`, { name, color });
    set((state) => ({
      tags: { ...state.tags, [groupId]: [...(state.tags[groupId] || []), data] },
    }));
    return data;
  },

  updateTag: async (tagId, updateData) => {
    const { data } = await api.patch(`/tags/${tagId}`, updateData);
    set((state) => {
      const newTags = { ...state.tags };
      for (const groupId of Object.keys(newTags)) {
        newTags[groupId] = newTags[groupId].map((t) => (t.id === tagId ? data : t));
      }
      return { tags: newTags };
    });
  },

  deleteTag: async (tagId, groupId) => {
    await api.delete(`/tags/${tagId}`);
    set((state) => ({
      tags: { ...state.tags, [groupId]: (state.tags[groupId] || []).filter((t) => t.id !== tagId) },
    }));
  },
}));
