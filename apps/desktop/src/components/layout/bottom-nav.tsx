'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckSquare,
  Link2,
  Network,
  CalendarDays,
  MoreHorizontal,
  Users,
  ActivityIcon,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const primaryTabs = [
  { href: '/workspace', icon: CheckSquare, labelKey: 'myTasks' as const },
  { href: '/threads', icon: Link2, labelKey: 'threads' as const },
  { href: '/graph', icon: Network, labelKey: 'graph' as const },
  { href: '/calendar', icon: CalendarDays, labelKey: 'calendar' as const },
];

const moreItems = [
  { href: '/teams', icon: Users, labelKey: 'teams' as const },
  { href: '/activity', icon: ActivityIcon, labelKey: 'activity' as const },
  { href: '/notifications', icon: Bell, labelKey: 'notifications' as const, showBadge: true },
  { href: '/settings', icon: Settings, labelKey: 'settings' as const },
  { href: '/help', icon: HelpCircle, labelKey: 'help' as const },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const t = useTranslations('sidebar');
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  );

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-white/10 bg-[#1A1A1A] pb-[calc(env(safe-area-inset-bottom)+4rem)] animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-8 rounded-full bg-white/20" />
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 px-5 pb-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Separator */}
            <div className="mx-5 border-b border-white/10" />

            {/* Menu items */}
            <nav className="px-3 py-2 space-y-0.5">
              {moreItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.labelKey}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{t(item.labelKey)}</span>
                    {item.showBadge && unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Separator */}
            <div className="mx-5 border-b border-white/10" />

            {/* Theme toggle */}
            <div className="px-5 py-3">
              <ThemeToggle />
            </div>

            {/* Separator */}
            <div className="mx-5 border-b border-white/10" />

            {/* Logout */}
            <div className="px-3 py-2">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-end border-t border-white/10 bg-[#1A1A1A] pb-[env(safe-area-inset-bottom)]">
        {primaryTabs.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.labelKey}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                isActive ? 'text-white' : 'text-zinc-500',
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] leading-tight">{t(item.labelKey)}</span>
            </Link>
          );
        })}

        {/* More tab */}
        <button
          onClick={() => setMoreOpen((prev) => !prev)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors relative',
            moreOpen || isMoreActive ? 'text-white' : 'text-zinc-500',
          )}
        >
          {moreOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MoreHorizontal className="h-5 w-5" />
          )}
          <span className="text-[10px] leading-tight">{t('more')}</span>
          {!moreOpen && unreadCount > 0 && (
            <span className="absolute top-1.5 right-1/4 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
      </nav>
    </>
  );
}
