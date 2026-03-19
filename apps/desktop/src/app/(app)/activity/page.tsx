'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ActivityIcon,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Check,
  Users,
  UserPlus,
} from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

const actionIcons: Record<string, React.ReactNode> = {
  CREATED: <Plus className="h-3.5 w-3.5 text-green-500" />,
  UPDATED: <Pencil className="h-3.5 w-3.5 text-blue-500" />,
  DELETED: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
  CONNECTED: <Link2 className="h-3.5 w-3.5 text-indigo-500" />,
  RESOLVED: <Check className="h-3.5 w-3.5 text-green-500" />,
  JOINED: <UserPlus className="h-3.5 w-3.5 text-blue-500" />,
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentWorkspace } = useWorkspaceStore();
  const t = useTranslations('activity');

  function describeActivity(a: Activity): string {
    const entity = a.entityType.toLowerCase();
    const name = a.metadata?.name || a.metadata?.title || entity;

    switch (a.action) {
      case 'CREATED':
        return t('created', { entity, name });
      case 'UPDATED':
        return t('updated', { entity, name });
      case 'DELETED':
        return t('deleted', { entity, name });
      case 'CONNECTED':
        return t('connected', { name });
      case 'RESOLVED':
        return t('resolved', { name });
      case 'JOINED':
        return t('joined', { entity, name });
      default:
        return `${a.action.toLowerCase()} ${entity}`;
    }
  }

  useEffect(() => {
    if (!currentWorkspace) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    api
      .get(`/workspaces/${currentWorkspace.id}/activity`)
      .then(({ data }) => setActivities(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [currentWorkspace]);

  // Group by date
  const grouped = activities.reduce<Record<string, Activity[]>>((acc, a) => {
    const date = new Date(a.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(a);
    return acc;
  }, {});

  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ActivityIcon className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{t('noActivity')}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                {date}
              </p>
              <div className="space-y-0 border-l-2 border-border ml-3">
                {items.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 pl-4 pb-4 relative">
                    <div className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2 border-background bg-card flex items-center justify-center">
                      {actionIcons[a.action] || (
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      )}
                    </div>
                    <Avatar className="h-5 w-5 mt-0.5 shrink-0">
                      <AvatarFallback className="text-[8px] bg-secondary">
                        {a.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{a.user.name}</span>{' '}
                        <span className="text-muted-foreground">
                          {describeActivity(a)}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(a.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
