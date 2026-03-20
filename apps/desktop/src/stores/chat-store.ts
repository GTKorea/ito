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
  todoId: string;
  senderId: string;
  sender: ChatUser;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  // Messages keyed by todoId
  messagesByTodo: Record<string, ChatMessage[]>;
  // Loading state per todo
  loadingByTodo: Record<string, boolean>;
  // Cursor for pagination per todo
  cursorsByTodo: Record<string, string | null>;
  // Whether more messages exist per todo
  hasMoreByTodo: Record<string, boolean>;
  // Currently active chat todoId
  activeTodoId: string | null;

  openChat: (todoId: string) => void;
  closeChat: () => void;
  fetchMessages: (todoId: string) => Promise<void>;
  fetchMoreMessages: (todoId: string) => Promise<void>;
  sendMessage: (todoId: string, content: string) => Promise<void>;
  addMessage: (todoId: string, message: ChatMessage) => void;
  joinRoom: (todoId: string) => void;
  leaveRoom: (todoId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByTodo: {},
  loadingByTodo: {},
  cursorsByTodo: {},
  hasMoreByTodo: {},
  activeTodoId: null,

  openChat: (todoId: string) => {
    set({ activeTodoId: todoId });
    get().joinRoom(todoId);
    // Fetch if not already loaded
    if (!get().messagesByTodo[todoId]) {
      get().fetchMessages(todoId);
    }
  },

  closeChat: () => {
    const todoId = get().activeTodoId;
    if (todoId) get().leaveRoom(todoId);
    set({ activeTodoId: null });
  },

  fetchMessages: async (todoId: string) => {
    set((state) => ({
      loadingByTodo: { ...state.loadingByTodo, [todoId]: true },
    }));
    try {
      const { data } = await api.get(`/todos/${todoId}/messages`, {
        params: { limit: '50' },
      });
      set((state) => ({
        messagesByTodo: {
          ...state.messagesByTodo,
          // Reverse so oldest first for display
          [todoId]: [...data.messages].reverse(),
        },
        cursorsByTodo: {
          ...state.cursorsByTodo,
          [todoId]: data.nextCursor,
        },
        hasMoreByTodo: {
          ...state.hasMoreByTodo,
          [todoId]: data.hasMore,
        },
        loadingByTodo: { ...state.loadingByTodo, [todoId]: false },
      }));
    } catch {
      set((state) => ({
        loadingByTodo: { ...state.loadingByTodo, [todoId]: false },
      }));
    }
  },

  fetchMoreMessages: async (todoId: string) => {
    const cursor = get().cursorsByTodo[todoId];
    if (!cursor || get().loadingByTodo[todoId]) return;

    set((state) => ({
      loadingByTodo: { ...state.loadingByTodo, [todoId]: true },
    }));
    try {
      const { data } = await api.get(`/todos/${todoId}/messages`, {
        params: { cursor, limit: '50' },
      });
      set((state) => ({
        messagesByTodo: {
          ...state.messagesByTodo,
          // Prepend older messages (reversed) before existing
          [todoId]: [
            ...[...data.messages].reverse(),
            ...(state.messagesByTodo[todoId] || []),
          ],
        },
        cursorsByTodo: {
          ...state.cursorsByTodo,
          [todoId]: data.nextCursor,
        },
        hasMoreByTodo: {
          ...state.hasMoreByTodo,
          [todoId]: data.hasMore,
        },
        loadingByTodo: { ...state.loadingByTodo, [todoId]: false },
      }));
    } catch {
      set((state) => ({
        loadingByTodo: { ...state.loadingByTodo, [todoId]: false },
      }));
    }
  },

  sendMessage: async (todoId: string, content: string) => {
    try {
      const { data } = await api.post(`/todos/${todoId}/messages`, {
        content,
      });
      // The server broadcasts via WebSocket, but we also add it
      // optimistically to avoid duplication we check if it already exists
      set((state) => {
        const existing = state.messagesByTodo[todoId] || [];
        if (existing.some((m) => m.id === data.id)) return state;
        return {
          messagesByTodo: {
            ...state.messagesByTodo,
            [todoId]: [...existing, data],
          },
        };
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  },

  addMessage: (todoId: string, message: ChatMessage) => {
    set((state) => {
      const existing = state.messagesByTodo[todoId] || [];
      // Deduplicate
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByTodo: {
          ...state.messagesByTodo,
          [todoId]: [...existing, message],
        },
      };
    });
  },

  joinRoom: (todoId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('joinTodoChat', { todoId });
    }
  },

  leaveRoom: (todoId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('leaveTodoChat', { todoId });
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
    useChatStore.getState().addMessage(message.todoId, message);
  });
}
