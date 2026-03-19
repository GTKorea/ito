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
  fromUserId: string;
  toUserId: string;
  message?: string;
  status: string;
  chainIndex: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface TaskGraphTodo {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  creator: User;
  assignee: User;
  creatorId: string;
  assigneeId: string;
  threadLinks: ThreadLink[];
  myRole: 'creator' | 'assignee' | 'chain_member';
  createdAt: string;
  updatedAt: string;
}

interface GraphState {
  todos: TaskGraphTodo[];
  isLoading: boolean;
  scope: 'active' | 'all' | 'completed';
  statusFilter: string[];
  priorityFilter: string[];
  searchQuery: string;
  layoutMode: 'force' | 'hierarchy';
  selectedTodoId: string | null;
  fetchGraphData: (workspaceId: string) => Promise<void>;
  setScope: (scope: 'active' | 'all' | 'completed') => void;
  setStatusFilter: (filter: string[]) => void;
  setPriorityFilter: (filter: string[]) => void;
  setSearchQuery: (query: string) => void;
  setLayoutMode: (mode: 'force' | 'hierarchy') => void;
  selectTodo: (todoId: string | null) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  todos: [],
  isLoading: false,
  scope: 'active',
  statusFilter: [],
  priorityFilter: [],
  searchQuery: '',
  layoutMode: 'force',
  selectedTodoId: null,

  fetchGraphData: async (workspaceId: string) => {
    set({ isLoading: true });
    try {
      const { scope, statusFilter, priorityFilter } = get();
      const params: Record<string, string> = { scope };
      if (statusFilter.length > 0) params.status = statusFilter.join(',');
      if (priorityFilter.length > 0) params.priority = priorityFilter.join(',');

      const { data } = await api.get(`/workspaces/${workspaceId}/task-graph`, { params });
      set({ todos: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setScope: (scope) => set({ scope }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setPriorityFilter: (filter) => set({ priorityFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  selectTodo: (todoId) => set({ selectedTodoId: todoId }),
}));
