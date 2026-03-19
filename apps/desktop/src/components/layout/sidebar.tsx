'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckSquare,
  Link2,
  Users,
  Bell,
  Settings,
  ActivityIcon,
  CalendarDays,
  Network,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';

const navItems = [
  { href: '/workspace', icon: CheckSquare, labelKey: 'myTasks' as const },
  { href: '/threads', icon: Link2, labelKey: 'threads' as const },
  { href: '/graph', icon: Network, labelKey: 'graph' as const },
  { href: '/teams', icon: Users, labelKey: 'teams' as const },
  { href: '/activity', icon: ActivityIcon, labelKey: 'activity' as const },
  { href: '/calendar', icon: CalendarDays, labelKey: 'calendar' as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const t = useTranslations('sidebar');

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Workspace switcher */}
      <WorkspaceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.labelKey}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}

        <Separator className="my-2" />

        <Link
          href="/notifications"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.includes('/notifications')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <Bell className="h-4 w-4" />
          {t('notifications')}
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Link>

        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.includes('/settings')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <Settings className="h-4 w-4" />
          {t('settings')}
        </Link>
      </nav>

      {/* Theme */}
      <div className="px-3 pb-2">
        <ThemeToggle />
      </div>

      {/* User */}
      <div className="border-t border-border p-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-sm">{user?.name}</span>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
