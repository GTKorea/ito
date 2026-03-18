'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { connectWs, disconnectWs } from '@/lib/ws-client';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
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
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    connectWs(data.accessToken);
    const { data: user } = await api.get('/users/me');
    set({ user, isAuthenticated: true, isLoading: false });
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
    set({ user: null, isAuthenticated: false });
  },
}));
