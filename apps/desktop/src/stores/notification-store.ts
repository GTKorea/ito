'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { getSocket } from '@/lib/ws-client';
import { sendDesktopNotification, formatNotification } from '@/lib/desktop-notify';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  listenToWs: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications');
      const unreadCount = data.filter((n: Notification) => !n.read).length;
      set({ notifications: data, unreadCount });
    } catch {
      // API not available yet — ignore silently
    }
  },

  markAsRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await api.patch('/notifications/read-all');
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  listenToWs: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('notification:new', (notification: Notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));

      const { title, body } = formatNotification(notification);
      sendDesktopNotification(title, body);
    });
  },
}));
