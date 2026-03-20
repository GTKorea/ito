'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { connectWs, disconnectWs } from '@/lib/ws-client';
import { requestNotificationPermission } from '@/lib/desktop-notify';
import { identifyUser, resetUser, trackEvent } from '@/lib/analytics';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  status?: string;
  position?: string;
  socialLinks?: { platform: string; url: string }[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  fetchUser: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    connectWs(data.accessToken);
    const { data: user } = await api.get('/users/me');
    set({ user, isAuthenticated: true, isLoading: false });
    identifyUser(user.id, { email: user.email, name: user.name });
    requestNotificationPermission();
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    connectWs(data.accessToken);
    const { data: user } = await api.get('/users/me');
    set({ user, isAuthenticated: true, isLoading: false });
    identifyUser(user.id, { email: user.email, name: user.name });
    trackEvent('user_registered');
    requestNotificationPermission();
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    connectWs(accessToken);
  },

  fetchUser: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      connectWs(token);
      const { data } = await api.get('/users/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
      requestNotificationPermission();
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    set((state) => ({
      user: state.user ? { ...state.user, avatarUrl: data.avatarUrl } : null,
    }));
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    disconnectWs();
    resetUser();
    set({ user: null, isAuthenticated: false });
  },
}));
