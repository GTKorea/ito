'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const t = useTranslations('sidebar');
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState(-1);

  // Track navigation history to enable/disable back/forward
  useEffect(() => {
    setNavHistory((prev) => {
      const trimmed = prev.slice(0, navIndex + 1);
      if (trimmed[trimmed.length - 1] === pathname) return prev;
      const next = [...trimmed, pathname];
      setNavIndex(next.length - 1);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const handleBack = useCallback(() => {
    if (canGoBack) {
      const prev = navHistory[navIndex - 1];
      setNavIndex((i) => i - 1);
      router.push(prev);
    }
  }, [canGoBack, navHistory, navIndex, router]);

  const handleForward = useCallback(() => {
    if (canGoForward) {
      const next = navHistory[navIndex + 1];
      setNavIndex((i) => i + 1);
      router.push(next);
    }
  }, [canGoForward, navHistory, navIndex, router]);

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
      className="flex h-11 shrink-0 items-center border-b border-border/50 bg-card/50"
      {...(tauri ? { 'data-tauri-drag-region': '' } : {})}
      style={tauri ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
    >
      <div className="w-3 shrink-0" />
      {/* Navigation buttons — no-drag to prevent blocking window drag */}
      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleBack}
          disabled={!canGoBack}
          className={cn(
            'h-7 w-7 rounded-md transition-colors',
            canGoBack
              ? 'text-muted-foreground hover:text-foreground'
              : 'text-muted-foreground/30 cursor-default',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleForward}
          disabled={!canGoForward}
          className={cn(
            'h-7 w-7 rounded-md transition-colors',
            canGoForward
              ? 'text-muted-foreground hover:text-foreground'
              : 'text-muted-foreground/30 cursor-default',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Breadcrumb */}
      {breadcrumbLabel && (
        <span className="text-[13px] font-medium text-foreground/80 ml-2 select-none" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {breadcrumbLabel}
        </span>
      )}

      {/* Spacer — draggable */}
      <div className="flex-1" {...(tauri ? { 'data-tauri-drag-region': '' } : {})} />

      {/* Search — no-drag */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSearch}
        className="text-muted-foreground gap-1.5 mr-3 h-7 px-2 rounded-md hover:bg-muted/50"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs text-muted-foreground/60">Search...</span>
        <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 sm:inline-flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>
    </header>
  );
}
