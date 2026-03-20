'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useNotificationStore } from '@/stores/notification-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Link2,
  ArrowLeftRight,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageTooltip } from '@/components/onboarding/page-tooltip';

const typeIcons: Record<string, React.ReactNode> = {
  THREAD_RECEIVED: <Link2 className="h-4 w-4 text-blue-500" />,
  THREAD_SNAPPED: <ArrowLeftRight className="h-4 w-4 text-green-500" />,
  THREAD_COMPLETED: <CheckCheck className="h-4 w-4 text-green-500" />,
  THREAD_DECLINED: <XCircle className="h-4 w-4 text-red-500" />,
  TODO_COMPLETED: <Check className="h-4 w-4 text-green-500" />,
  TODO_ASSIGNED: <UserPlus className="h-4 w-4 text-blue-500" />,
  WORKSPACE_INVITE: <UserPlus className="h-4 w-4 text-purple-500" />,
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();
  const t = useTranslations('notifications');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('daysAgo', { count: days });
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? t('unread', { count: unreadCount }) : t('allCaughtUp')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="mr-1 h-4 w-4" />
            {t('markAllRead')}
          </Button>
        )}
      </div>

      <div className="p-6 space-y-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BellOff className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{t('noNotifications')}</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-3 rounded-lg px-3 py-3 transition-colors cursor-pointer',
                !n.read
                  ? 'bg-accent/40 hover:bg-accent/60'
                  : 'hover:bg-accent/20',
              )}
              onClick={() => {
                if (!n.read) markAsRead(n.id);

                if (n.type === 'WORKSPACE_INVITE' && n.data?.token) {
                  router.push(`/invite?token=${n.data.token}`);
                } else if (n.data?.todoId) {
                  router.push(`/workspace?todo=${n.data.todoId}`);
                }
              }}
            >
              <div className="mt-0.5 shrink-0">
                {typeIcons[n.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', !n.read && 'font-medium')}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {n.body}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </div>
              {!n.read && (
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </div>
          ))
        )}
      </div>

      <PageTooltip
        pageKey="notifications"
        title="알림"
        description="실 활동과 워크스페이스 초대 알림이 여기에 옵니다"
      />
    </div>
  );
}
