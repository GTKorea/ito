import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotificationStore } from '@/stores/notification-store';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/lib/ws-client', () => ({
  getSocket: vi.fn(),
}));

import { api } from '@/lib/api-client';
import { getSocket } from '@/lib/ws-client';

const mockedApi = vi.mocked(api, true);
const mockedGetSocket = vi.mocked(getSocket);

const mockNotifications = [
  { id: 'n1', type: 'THREAD_RECEIVED', title: 'New thread', read: false, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'n2', type: 'TASK_ASSIGNED', title: 'Assigned to you', read: true, createdAt: '2026-01-02T00:00:00Z' },
  { id: 'n3', type: 'THREAD_SNAPPED', title: 'Thread snapped back', read: false, createdAt: '2026-01-03T00:00:00Z' },
];

describe('notification-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
    });
  });

  describe('initial state', () => {
    it('should start with empty notifications and zero unread', () => {
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch and compute unread count', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockNotifications });

      await useNotificationStore.getState().fetchNotifications();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications');
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual(mockNotifications);
      expect(state.unreadCount).toBe(2); // n1 and n3 are unread
    });

    it('should silently handle API errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      await useNotificationStore.getState().fetchNotifications();

      // Should not throw, state unchanged
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark a single notification as read and decrement unread count', async () => {
      useNotificationStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
      });
      mockedApi.patch.mockResolvedValueOnce({});

      await useNotificationStore.getState().markAsRead('n1');

      expect(mockedApi.patch).toHaveBeenCalledWith('/notifications/n1/read');
      const state = useNotificationStore.getState();
      const n1 = state.notifications.find((n) => n.id === 'n1');
      expect(n1?.read).toBe(true);
      expect(state.unreadCount).toBe(1);
    });

    it('should not go below zero unread count', async () => {
      useNotificationStore.setState({
        notifications: [{ ...mockNotifications[1] }], // already read
        unreadCount: 0,
      });
      mockedApi.patch.mockResolvedValueOnce({});

      await useNotificationStore.getState().markAsRead('n2');

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and set unread to zero', async () => {
      useNotificationStore.setState({
        notifications: mockNotifications,
        unreadCount: 2,
      });
      mockedApi.patch.mockResolvedValueOnce({});

      await useNotificationStore.getState().markAllAsRead();

      expect(mockedApi.patch).toHaveBeenCalledWith('/notifications/read-all');
      const state = useNotificationStore.getState();
      expect(state.notifications.every((n) => n.read)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('listenToWs', () => {
    it('should register listener when socket is available', () => {
      const mockOn = vi.fn();
      mockedGetSocket.mockReturnValue({ on: mockOn } as unknown as ReturnType<typeof mockedGetSocket>);

      useNotificationStore.getState().listenToWs();

      expect(mockOn).toHaveBeenCalledWith('notification:new', expect.any(Function));
    });

    it('should add new notification to state when event fires', () => {
      const mockOn = vi.fn();
      mockedGetSocket.mockReturnValue({ on: mockOn } as unknown as ReturnType<typeof mockedGetSocket>);

      useNotificationStore.getState().listenToWs();

      // Extract the callback and invoke it
      const callback = mockOn.mock.calls[0][1];
      const newNotif = { id: 'n4', type: 'TASK_COMPLETED', title: 'Done', read: false, createdAt: '2026-01-04T00:00:00Z' };
      callback(newNotif);

      const state = useNotificationStore.getState();
      expect(state.notifications[0]).toEqual(newNotif);
      expect(state.unreadCount).toBe(1);
    });

    it('should do nothing when socket is null', () => {
      mockedGetSocket.mockReturnValue(null);

      // Should not throw
      useNotificationStore.getState().listenToWs();
    });
  });
});
