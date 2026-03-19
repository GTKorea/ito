import { create } from 'zustand';

export type Locale = 'en' | 'ko' | 'ja' | 'zh-CN' | 'zh-TW' | 'es' | 'fr' | 'de' | 'pt';

export const SUPPORTED_LOCALES: { value: Locale; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { value: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { value: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { value: 'zh-TW', label: 'Chinese (Traditional)', nativeLabel: '繁體中文' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { value: 'fr', label: 'French', nativeLabel: 'Français' },
  { value: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { value: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
];

const DEFAULT_LOCALE: Locale = 'en';

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem('ito-locale');
  if (stored && SUPPORTED_LOCALES.some((l) => l.value === stored)) {
    return stored as Locale;
  }
  return DEFAULT_LOCALE;
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getStoredLocale(),
  setLocale: (locale: Locale) => {
    localStorage.setItem('ito-locale', locale);
    set({ locale });
  },
}));
