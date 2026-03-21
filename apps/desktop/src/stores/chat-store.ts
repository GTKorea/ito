'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { getSocket } from '@/lib/ws-client';

interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  taskId: string;
  senderId: string;
  sender: ChatUser;
  parentId?: string;
  replyCount?: number;
  files?: ChatFile[];
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

  // Thread state
  threadMessagesByParent: Record<string, ChatMessage[]>;
  activeThreadParentId: string | null;
  threadLoadingByParent: Record<string, boolean>;
  threadCursorsByParent: Record<string, string | null>;
  threadHasMoreByParent: Record<string, boolean>;

  openChat: (taskId: string) => void;
  closeChat: () => void;
  fetchMessages: (taskId: string) => Promise<void>;
  fetchMoreMessages: (taskId: string) => Promise<void>;
  sendMessage: (taskId: string, content: string, fileIds?: string[]) => Promise<void>;
  addMessage: (taskId: string, message: ChatMessage) => void;
  joinRoom: (taskId: string) => void;
  leaveRoom: (taskId: string) => void;

  // Thread actions
  openThread: (taskId: string, parentId: string) => void;
  closeThread: () => void;
  fetchThreadReplies: (taskId: string, parentId: string) => Promise<void>;
  fetchMoreThreadReplies: (taskId: string, parentId: string) => Promise<void>;
  sendThreadReply: (taskId: string, parentId: string, content: string, fileIds?: string[]) => Promise<void>;
  addThreadReply: (parentId: string, message: ChatMessage) => void;

  // File upload
  uploadChatFile: (taskId: string, file: File) => Promise<ChatFile>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByTask: {},
  loadingByTask: {},
  cursorsByTask: {},
  hasMoreByTask: {},
  activeTaskId: null,

  threadMessagesByParent: {},
  activeThreadParentId: null,
  threadLoadingByParent: {},
  threadCursorsByParent: {},
  threadHasMoreByParent: {},

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
    set({ activeTaskId: null, activeThreadParentId: null });
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

  sendMessage: async (taskId: string, content: string, fileIds?: string[]) => {
    try {
      const { data } = await api.post(`/tasks/${taskId}/messages`, {
        content,
        ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
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

  // Thread actions

  openThread: (taskId: string, parentId: string) => {
    set({ activeThreadParentId: parentId });
    const socket = getSocket();
    if (socket) {
      socket.emit('joinThread', { taskId, parentId });
    }
    // Fetch if not already loaded
    if (!get().threadMessagesByParent[parentId]) {
      get().fetchThreadReplies(taskId, parentId);
    }
  },

  closeThread: () => {
    const parentId = get().activeThreadParentId;
    if (parentId) {
      const socket = getSocket();
      if (socket) {
        socket.emit('leaveThread', { parentId });
      }
    }
    set({ activeThreadParentId: null });
  },

  fetchThreadReplies: async (taskId: string, parentId: string) => {
    set((state) => ({
      threadLoadingByParent: { ...state.threadLoadingByParent, [parentId]: true },
    }));
    try {
      const { data } = await api.get(
        `/tasks/${taskId}/messages/${parentId}/replies`,
        { params: { limit: '50' } },
      );
      set((state) => ({
        threadMessagesByParent: {
          ...state.threadMessagesByParent,
          [parentId]: [...data.messages].reverse(),
        },
        threadCursorsByParent: {
          ...state.threadCursorsByParent,
          [parentId]: data.nextCursor,
        },
        threadHasMoreByParent: {
          ...state.threadHasMoreByParent,
          [parentId]: data.hasMore,
        },
        threadLoadingByParent: { ...state.threadLoadingByParent, [parentId]: false },
      }));
    } catch {
      set((state) => ({
        threadLoadingByParent: { ...state.threadLoadingByParent, [parentId]: false },
      }));
    }
  },

  fetchMoreThreadReplies: async (taskId: string, parentId: string) => {
    const cursor = get().threadCursorsByParent[parentId];
    if (!cursor || get().threadLoadingByParent[parentId]) return;

    set((state) => ({
      threadLoadingByParent: { ...state.threadLoadingByParent, [parentId]: true },
    }));
    try {
      const { data } = await api.get(
        `/tasks/${taskId}/messages/${parentId}/replies`,
        { params: { cursor, limit: '50' } },
      );
      set((state) => ({
        threadMessagesByParent: {
          ...state.threadMessagesByParent,
          [parentId]: [
            ...[...data.messages].reverse(),
            ...(state.threadMessagesByParent[parentId] || []),
          ],
        },
        threadCursorsByParent: {
          ...state.threadCursorsByParent,
          [parentId]: data.nextCursor,
        },
        threadHasMoreByParent: {
          ...state.threadHasMoreByParent,
          [parentId]: data.hasMore,
        },
        threadLoadingByParent: { ...state.threadLoadingByParent, [parentId]: false },
      }));
    } catch {
      set((state) => ({
        threadLoadingByParent: { ...state.threadLoadingByParent, [parentId]: false },
      }));
    }
  },

  sendThreadReply: async (
    taskId: string,
    parentId: string,
    content: string,
    fileIds?: string[],
  ) => {
    try {
      const { data } = await api.post(`/tasks/${taskId}/messages`, {
        content,
        parentId,
        ...(fileIds && fileIds.length > 0 ? { fileIds } : {}),
      });

      // Add reply to thread messages
      set((state) => {
        const existing = state.threadMessagesByParent[parentId] || [];
        if (existing.some((m) => m.id === data.id)) return state;

        // Also update parent's replyCount in the main messages list
        const taskMessages = state.messagesByTask[taskId] || [];
        const updatedTaskMessages = taskMessages.map((m) =>
          m.id === parentId
            ? { ...m, replyCount: (m.replyCount || 0) + 1 }
            : m,
        );

        return {
          threadMessagesByParent: {
            ...state.threadMessagesByParent,
            [parentId]: [...existing, data],
          },
          messagesByTask: {
            ...state.messagesByTask,
            [taskId]: updatedTaskMessages,
          },
        };
      });
    } catch (err) {
      console.error('Failed to send thread reply:', err);
    }
  },

  addThreadReply: (parentId: string, message: ChatMessage) => {
    set((state) => {
      const existing = state.threadMessagesByParent[parentId] || [];
      if (existing.some((m) => m.id === message.id)) return state;

      // Also update parent's replyCount in the main messages list
      const taskId = message.taskId;
      const taskMessages = state.messagesByTask[taskId] || [];
      const updatedTaskMessages = taskMessages.map((m) =>
        m.id === parentId
          ? { ...m, replyCount: (m.replyCount || 0) + 1 }
          : m,
      );

      return {
        threadMessagesByParent: {
          ...state.threadMessagesByParent,
          [parentId]: [...existing, message],
        },
        messagesByTask: {
          ...state.messagesByTask,
          [taskId]: updatedTaskMessages,
        },
      };
    });
  },

  uploadChatFile: async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post(
      `/tasks/${taskId}/messages/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return data as ChatFile;
  },
}));

// Set up WebSocket listener for incoming messages (call once when socket connects)
export function setupChatListeners() {
  const socket = getSocket();
  if (!socket) return;

  // Remove existing listeners to avoid duplicates
  socket.off('newMessage');
  socket.off('newThreadReply');

  socket.on('newMessage', (message: ChatMessage) => {
    useChatStore.getState().addMessage(message.taskId, message);
  });

  socket.on('newThreadReply', (message: ChatMessage) => {
    if (message.parentId) {
      useChatStore.getState().addThreadReply(message.parentId, message);
    }
  });
}
