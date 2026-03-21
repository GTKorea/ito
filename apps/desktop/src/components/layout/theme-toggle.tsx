'use client';

import { useTranslations } from 'next-intl';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { cn } from '@/lib/utils';

const optionDefs = [
  { value: 'light' as const, icon: Sun, labelKey: 'light' as const },
  { value: 'dark' as const, icon: Moon, labelKey: 'dark' as const },
  { value: 'auto' as const, icon: Monitor, labelKey: 'system' as const },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const t = useTranslations('settings');

  return (
    <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
      {optionDefs.map(({ value, icon: Icon, labelKey }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center justify-center rounded-sm p-1.5 transition-colors',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title={t(`theme.${labelKey}`)}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
