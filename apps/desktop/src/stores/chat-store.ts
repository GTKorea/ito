'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { getSocket } from '@/lib/ws-client';

interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  taskId: string;
  senderId: string;
  sender: ChatUser;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  // Messages keyed by taskId
  messagesByTask: Record<string, ChatMessage[]>;
  // Loading state per task
  loadingByTask: Record<string, boolean>;
  // Cursor for pagination per task
  cursorsByTask: Record<string, string | null>;
  // Whether more messages exist per task
  hasMoreByTask: Record<string, boolean>;
  // Currently active chat taskId
  activeTaskId: string | null;

  openChat: (taskId: string) => void;
  closeChat: () => void;
  fetchMessages: (taskId: string) => Promise<void>;
  fetchMoreMessages: (taskId: string) => Promise<void>;
  sendMessage: (taskId: string, content: string) => Promise<void>;
  addMessage: (taskId: string, message: ChatMessage) => void;
  joinRoom: (taskId: string) => void;
  leaveRoom: (taskId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByTask: {},
  loadingByTask: {},
  cursorsByTask: {},
  hasMoreByTask: {},
  activeTaskId: null,

  openChat: (taskId: string) => {
    set({ activeTaskId: taskId });
    get().joinRoom(taskId);
    // Fetch if not already loaded
    if (!get().messagesByTask[taskId]) {
      get().fetchMessages(taskId);
    }
  },

  closeChat: () => {
    const taskId = get().activeTaskId;
    if (taskId) get().leaveRoom(taskId);
    set({ activeTaskId: null });
  },

  fetchMessages: async (taskId: string) => {
    set((state) => ({
      loadingByTask: { ...state.loadingByTask, [taskId]: true },
    }));
    try {
      const { data } = await api.get(`/tasks/${taskId}/messages`, {
        params: { limit: '50' },
      });
      set((state) => ({
        messagesByTask: {
          ...state.messagesByTask,
          // Reverse so oldest first for display
          [taskId]: [...data.messages].reverse(),
        },
        cursorsByTask: {
          ...state.cursorsByTask,
          [taskId]: data.nextCursor,
        },
        hasMoreByTask: {
          ...state.hasMoreByTask,
          [taskId]: data.hasMore,
        },
        loadingByTask: { ...state.loadingByTask, [taskId]: false },
      }));
    } catch {
      set((state) => ({
        loadingByTask: { ...state.loadingByTask, [taskId]: false },
      }));
    }
  },

  fetchMoreMessages: async (taskId: string) => {
    const cursor = get().cursorsByTask[taskId];
    if (!cursor || get().loadingByTask[taskId]) return;

    set((state) => ({
      loadingByTask: { ...state.loadingByTask, [taskId]: true },
    }));
    try {
      const { data } = await api.get(`/tasks/${taskId}/messages`, {
        params: { cursor, limit: '50' },
      });
      set((state) => ({
        messagesByTask: {
          ...state.messagesByTask,
          // Prepend older messages (reversed) before existing
          [taskId]: [
            ...[...data.messages].reverse(),
            ...(state.messagesByTask[taskId] || []),
          ],
        },
        cursorsByTask: {
          ...state.cursorsByTask,
          [taskId]: data.nextCursor,
        },
        hasMoreByTask: {
          ...state.hasMoreByTask,
          [taskId]: data.hasMore,
        },
        loadingByTask: { ...state.loadingByTask, [taskId]: false },
      }));
    } catch {
      set((state) => ({
        loadingByTask: { ...state.loadingByTask, [taskId]: false },
      }));
    }
  },

  sendMessage: async (taskId: string, content: string) => {
    try {
      const { data } = await api.post(`/tasks/${taskId}/messages`, {
        content,
      });
      // The server broadcasts via WebSocket, but we also add it
      // optimistically to avoid duplication we check if it already exists
      set((state) => {
        const existing = state.messagesByTask[taskId] || [];
        if (existing.some((m) => m.id === data.id)) return state;
        return {
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: [...existing, data],
          },
        };
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  },

  addMessage: (taskId: string, message: ChatMessage) => {
    set((state) => {
      const existing = state.messagesByTask[taskId] || [];
      // Deduplicate
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: [...existing, message],
        },
      };
    });
  },

  joinRoom: (taskId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('joinTaskChat', { taskId });
    }
  },

  leaveRoom: (taskId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('leaveTaskChat', { taskId });
    }
  },
}));

// Set up WebSocket listener for incoming messages (call once when socket connects)
export function setupChatListeners() {
  const socket = getSocket();
  if (!socket) return;

  // Remove existing listener to avoid duplicates
  socket.off('newMessage');

  socket.on('newMessage', (message: ChatMessage) => {
    useChatStore.getState().addMessage(message.taskId, message);
  });
}
