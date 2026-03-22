'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
  HelpCircle,
  ChevronsLeft,
  ChevronsRight,
  Globe,
  Hash,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useTaskGroupStore } from '@/stores/task-group-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';
import { UserProfilePopover } from '@/components/user/user-profile-popover';

const navItems = [
  { href: '/workspace', icon: CheckSquare, labelKey: 'myTasks' as const },
  { href: '/shared-spaces', icon: Globe, labelKey: 'sharedSpaces' as const },
  { href: '/graph', icon: Network, labelKey: 'graph' as const },
  { href: '/threads', icon: Link2, labelKey: 'threads' as const },
  { href: '/teams', icon: Users, labelKey: 'teams' as const },
  { href: '/activity', icon: ActivityIcon, labelKey: 'activity' as const },
  { href: '/calendar', icon: CalendarDays, labelKey: 'calendar' as const },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { groups, fetchGroups, createGroup } = useTaskGroupStore();
  const t = useTranslations('sidebar');

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (currentWorkspace) {
      fetchGroups(currentWorkspace.id);
    }
  }, [currentWorkspace, fetchGroups]);

  return (
    <aside
      className={cn(
        'hidden md:flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Workspace switcher */}
      {collapsed ? (
        <div className="flex h-12 items-center justify-center border-b border-border">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
            糸
          </div>
        </div>
      ) : (
        <WorkspaceSwitcher />
      )}

      {/* Navigation */}
      <nav className={cn('flex-1 space-y-0.5', collapsed ? 'p-1.5' : 'p-2')}>
        {navItems.map((item) => {
          const isActive = item.href === '/workspace'
            ? pathname === item.href && !searchParams.get('group')
            : pathname === item.href || pathname.startsWith(item.href + '/');

          const linkContent = (
            <Link
              key={item.labelKey}
              href={item.href}
              className={cn(
                'flex items-center rounded-md transition-colors',
                collapsed
                  ? 'justify-center p-2'
                  : 'gap-2 px-2 py-1.5 text-sm',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.labelKey}>
                <TooltipTrigger render={<div />}>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <div key={item.labelKey}>
              {linkContent}
              {!collapsed && item.labelKey === 'myTasks' && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {groups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/workspace?group=${group.id}`}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                        searchParams.get('group') === group.id
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                      )}
                    >
                      <Hash className="h-3 w-3 shrink-0" />
                      <span className="truncate">{group.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground/60">{group._count.tasks}</span>
                    </Link>
                  ))}
                  {showNewGroup ? (
                    <form
                      className="flex items-center gap-1 px-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newGroupName.trim() && currentWorkspace) {
                          createGroup(currentWorkspace.id, newGroupName.trim());
                          setNewGroupName('');
                          setShowNewGroup(false);
                        }
                      }}
                    >
                      <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                      <input
                        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 py-1"
                        placeholder={t('newGroup')}
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onBlur={() => { setShowNewGroup(false); setNewGroupName(''); }}
                        autoFocus
                      />
                    </form>
                  ) : (
                    <button
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors w-full"
                      onClick={() => setShowNewGroup(true)}
                    >
                      <Plus className="h-3 w-3" />
                      <span>{t('newGroup')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <Separator className="my-2" />

        {/* Notifications */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={<div />}>
              <Link
                href="/notifications"
                className={cn(
                  'flex items-center justify-center rounded-md p-2 transition-colors relative',
                  pathname.includes('/notifications')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t('notifications')}
              {unreadCount > 0 && ` (${unreadCount})`}
            </TooltipContent>
          </Tooltip>
        ) : (
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
        )}

        {/* Settings */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={<div />}>
              <Link
                href="/settings"
                className={cn(
                  'flex items-center justify-center rounded-md p-2 transition-colors',
                  pathname.includes('/settings')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('settings')}</TooltipContent>
          </Tooltip>
        ) : (
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
        )}

        {/* Help */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={<div />}>
              <Link
                href="/help"
                className={cn(
                  'flex items-center justify-center rounded-md p-2 transition-colors',
                  pathname.includes('/help')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <HelpCircle className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t('help')}</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/help"
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              pathname.includes('/help')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <HelpCircle className="h-4 w-4" />
            {t('help')}
          </Link>
        )}

      </nav>

      {/* Theme + Collapse toggle */}
      <div className={cn('pb-2', collapsed ? 'px-1.5' : 'px-3')}>
        {!collapsed && <ThemeToggle />}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors mt-1',
              collapsed ? 'justify-center p-2 w-full' : 'gap-2 px-2 py-1.5 text-sm w-full',
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>{t('collapse')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* User */}
      <div className="border-t border-border p-2">
        <div
          className={cn(
            'flex items-center rounded-md',
            collapsed ? 'justify-center px-0 py-1.5' : 'gap-2 px-2 py-1.5',
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger render={<div className="shrink-0" />}>
                {user?.id ? (
                  <UserProfilePopover userId={user.id}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </UserProfilePopover>
                ) : (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </TooltipTrigger>
              <TooltipContent side="right">{user?.name}</TooltipContent>
            </Tooltip>
          ) : (
            <>
              {user?.id ? (
                <UserProfilePopover userId={user.id}>
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </UserProfilePopover>
              ) : (
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="flex-1 truncate text-sm">{user?.name}</span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={logout}
                      className="text-muted-foreground hover:text-foreground"
                    />
                  }
                >
                  <LogOut className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent side="right">{t('logout')}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
