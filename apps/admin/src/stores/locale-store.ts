import { create } from 'zustand';

export type Locale = 'en' | 'ko';

const DEFAULT_LOCALE: Locale = 'en';

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem('ito-admin-locale');
  if (stored === 'en' || stored === 'ko') return stored;
  return DEFAULT_LOCALE;
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getStoredLocale(),
  setLocale: (locale: Locale) => {
    localStorage.setItem('ito-admin-locale', locale);
    set({ locale });
  },
}));
