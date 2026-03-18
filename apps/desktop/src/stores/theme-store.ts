'use client';

import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('ito-theme');
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored;
  }
  return 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: (theme: Theme) => {
    const resolved = getResolvedTheme(theme);
    localStorage.setItem('ito-theme', theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
  },
}));

/** Call once on mount to hydrate from localStorage and set up auto listener */
export function initializeTheme() {
  const store = useThemeStore.getState();
  const theme = getStoredTheme();
  const resolved = getResolvedTheme(theme);
  applyTheme(resolved);
  useThemeStore.setState({ theme, resolvedTheme: resolved });

  // Listen for system theme changes when in auto mode
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const current = useThemeStore.getState();
    if (current.theme === 'auto') {
      const newResolved = mediaQuery.matches ? 'dark' : 'light';
      applyTheme(newResolved);
      useThemeStore.setState({ resolvedTheme: newResolved });
    }
  };
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
