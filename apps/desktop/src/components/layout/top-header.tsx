'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { isTauri } from '@/lib/platform';

const breadcrumbMap: Record<string, string> = {
  '/workspace': 'myTasks',
  '/threads': 'threads',
  '/shared-spaces': 'sharedSpaces',
  '/graph': 'graph',
  '/teams': 'teams',
  '/activity': 'activity',
  '/calendar': 'calendar',
  '/settings': 'settings',
  '/notifications': 'notifications',
  '/help': 'help',
};

export function TopHeader() {
  const pathname = usePathname();
  const t = useTranslations('sidebar');

  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleForward = useCallback(() => {
    window.history.forward();
  }, []);

  const handleSearch = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      }),
    );
  }, []);

  const matchedKey = Object.keys(breadcrumbMap).find(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  );
  const breadcrumbLabel = matchedKey ? t(breadcrumbMap[matchedKey]) : '';

  const tauri = isTauri();

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-1 border-b border-border px-3',
        tauri && 'pl-[70px]',
      )}
      {...(tauri ? { 'data-tauri-drag-region': '' } : {})}
    >
      {/* Navigation buttons */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleBack}
          className="text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleForward}
          className="text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Breadcrumb */}
      {breadcrumbLabel && (
        <span className="text-sm font-medium text-foreground ml-1">
          {breadcrumbLabel}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" {...(tauri ? { 'data-tauri-drag-region': '' } : {})} />

      {/* Search button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSearch}
        className="text-muted-foreground gap-2"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs text-muted-foreground/70">Search...</span>
        <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>
    </header>
  );
}
