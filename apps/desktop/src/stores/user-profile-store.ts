'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  status?: string;
  position?: string;
  socialLinks?: { platform: string; url: string }[];
  createdAt: string;
}

interface CachedProfile {
  profile: UserProfile;
  fetchedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UserProfileStore {
  profiles: Record<string, CachedProfile>;
  loading: Record<string, boolean>;
  fetchProfile: (userId: string) => Promise<UserProfile>;
  invalidateProfile: (userId: string) => void;
}

export const useUserProfileStore = create<UserProfileStore>((set, get) => ({
  profiles: {},
  loading: {},

  fetchProfile: async (userId: string) => {
    const cached = get().profiles[userId];
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.profile;
    }

    set((state) => ({ loading: { ...state.loading, [userId]: true } }));

    try {
      const { data } = await api.get(`/users/${userId}/profile`);
      const profile = data as UserProfile;

      set((state) => ({
        profiles: {
          ...state.profiles,
          [userId]: { profile, fetchedAt: Date.now() },
        },
        loading: { ...state.loading, [userId]: false },
      }));

      return profile;
    } catch (error) {
      set((state) => ({ loading: { ...state.loading, [userId]: false } }));
      throw error;
    }
  },

  invalidateProfile: (userId: string) => {
    set((state) => {
      const { [userId]: _, ...rest } = state.profiles;
      return { profiles: rest };
    });
  },
}));
