import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';

// Mock ws-client
vi.mock('@/lib/ws-client', () => ({
  connectWs: vi.fn(),
  disconnectWs: vi.fn(),
}));

// Mock api-client
vi.mock('@/lib/api-client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '@/lib/api-client';
import { connectWs, disconnectWs } from '@/lib/ws-client';

const mockedApi = vi.mocked(api);
const mockedConnectWs = vi.mocked(connectWs);
const mockedDisconnectWs = vi.mocked(disconnectWs);

describe('auth-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
  });

  describe('initial state', () => {
    it('should start with no user, loading true, not authenticated', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should store tokens, connect ws, fetch user, and set authenticated', async () => {
      const mockTokens = { accessToken: 'access-123', refreshToken: 'refresh-456' };
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test User' };

      mockedApi.post.mockResolvedValueOnce({ data: mockTokens });
      mockedApi.get.mockResolvedValueOnce({ data: mockUser });

      await useAuthStore.getState().login('test@test.com', 'password123');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password123',
      });
      expect(localStorage.getItem('accessToken')).toBe('access-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
      expect(mockedConnectWs).toHaveBeenCalledWith('access-123');
      expect(mockedApi.get).toHaveBeenCalledWith('/users/me');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should propagate errors on login failure', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(
        useAuthStore.getState().login('bad@test.com', 'wrong'),
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('register', () => {
    it('should store tokens, connect ws, fetch user, and set authenticated', async () => {
      const mockTokens = { accessToken: 'acc-new', refreshToken: 'ref-new' };
      const mockUser = { id: '2', email: 'new@test.com', name: 'New User' };

      mockedApi.post.mockResolvedValueOnce({ data: mockTokens });
      mockedApi.get.mockResolvedValueOnce({ data: mockUser });

      await useAuthStore.getState().register('new@test.com', 'password123', 'New User');

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
      });
      expect(localStorage.getItem('accessToken')).toBe('acc-new');
      expect(localStorage.getItem('refreshToken')).toBe('ref-new');
      expect(mockedConnectWs).toHaveBeenCalledWith('acc-new');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('setTokens', () => {
    it('should store tokens in localStorage and connect ws', () => {
      useAuthStore.getState().setTokens('tok-a', 'tok-r');

      expect(localStorage.getItem('accessToken')).toBe('tok-a');
      expect(localStorage.getItem('refreshToken')).toBe('tok-r');
      expect(mockedConnectWs).toHaveBeenCalledWith('tok-a');
    });
  });

  describe('fetchUser', () => {
    it('should fetch user when access token exists', async () => {
      localStorage.setItem('accessToken', 'existing-token');
      const mockUser = { id: '3', email: 'existing@test.com', name: 'Existing' };
      mockedApi.get.mockResolvedValueOnce({ data: mockUser });

      await useAuthStore.getState().fetchUser();

      expect(mockedConnectWs).toHaveBeenCalledWith('existing-token');
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading false when no token exists', async () => {
      await useAuthStore.getState().fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should clear auth state when fetch fails', async () => {
      localStorage.setItem('accessToken', 'bad-token');
      mockedApi.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await useAuthStore.getState().fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear tokens, disconnect ws, and reset state', () => {
      // Set up authenticated state
      localStorage.setItem('accessToken', 'tok');
      localStorage.setItem('refreshToken', 'ref');
      useAuthStore.setState({
        user: { id: '1', email: 'a@b.com', name: 'A' },
        isAuthenticated: true,
        isLoading: false,
      });

      useAuthStore.getState().logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(mockedDisconnectWs).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar and update user avatarUrl', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'a@b.com', name: 'A' },
        isAuthenticated: true,
        isLoading: false,
      });

      const mockFile = new File([''], 'avatar.png', { type: 'image/png' });
      mockedApi.post.mockResolvedValueOnce({ data: { avatarUrl: 'https://cdn.example.com/avatar.png' } });

      await useAuthStore.getState().uploadAvatar(mockFile);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/users/me/avatar',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const state = useAuthStore.getState();
      expect(state.user?.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    });

    it('should not crash when user is null', async () => {
      const mockFile = new File([''], 'avatar.png', { type: 'image/png' });
      mockedApi.post.mockResolvedValueOnce({ data: { avatarUrl: 'https://cdn.example.com/avatar.png' } });

      await useAuthStore.getState().uploadAvatar(mockFile);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });
});
