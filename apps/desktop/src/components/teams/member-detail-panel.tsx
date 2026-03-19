'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { api } from '@/lib/api-client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X,
  CheckCircle2,
  ListTodo,
  Link2,
  ActivityIcon,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberSummary {
  user: { id: string; name: string; email: string; avatarUrl?: string };
  role: string;
  assignedTodos: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
  }>;
  activeThreads: Array<{
    id: string;
    status: string;
    fromUser: { id: string; name: string };
    toUser: { id: string; name: string };
    todo: { id: string; title: string };
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
    createdAt: string;
  }>;
  stats: {
    totalTodos: number;
    completedTodos: number;
    activeThreads: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-gray-500/15 text-gray-400',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400',
  BLOCKED: 'bg-red-500/15 text-red-400',
  COMPLETED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-gray-500/15 text-gray-500',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ADMIN: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  MEMBER: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  GUEST: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const THREAD_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  FORWARDED: 'bg-blue-500/15 text-blue-400',
};

interface MemberDetailPanelProps {
  userId: string;
  onClose: () => void;
}

export function MemberDetailPanel({ userId, onClose }: MemberDetailPanelProps) {
  const { currentWorkspace } = useWorkspaceStore();
  const [data, setData] = useState<MemberSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('teams');

  useEffect(() => {
    if (!currentWorkspace || !userId) return;
    setIsLoading(true);
    api
      .get(`/workspaces/${currentWorkspace.id}/members/${userId}/summary`)
      .then(({ data }) => setData(data))
      .catch((e) => console.error('Failed to load member details:', e))
      .finally(() => setIsLoading(false));
  }, [currentWorkspace, userId]);

  if (isLoading || !data) {
    return (
      <div className="flex h-full w-full items-center justify-center border-l border-border bg-[#1A1A1A]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const completionRate =
    data.stats.totalTodos > 0
      ? Math.round((data.stats.completedTodos / data.stats.totalTodos) * 100)
      : 0;

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-[#1A1A1A]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-[#ECECEC]">
          {t('memberDetail') || 'Member Detail'}
        </h2>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {data.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{data.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{data.user.email}</p>
          </div>
          <Badge variant="outline" className={cn('text-[10px]', ROLE_COLORS[data.role])}>
            {data.role}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-accent/30 p-2.5 text-center">
            <p className="text-lg font-bold">{data.stats.totalTodos}</p>
            <p className="text-[10px] text-muted-foreground">
              {t('totalTasks') || 'Tasks'}
            </p>
          </div>
          <div className="rounded-lg bg-accent/30 p-2.5 text-center">
            <p className="text-lg font-bold text-green-400">{completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">
              {t('completionRate') || 'Completed'}
            </p>
          </div>
          <div className="rounded-lg bg-accent/30 p-2.5 text-center">
            <p className="text-lg font-bold text-yellow-400">{data.stats.activeThreads}</p>
            <p className="text-[10px] text-muted-foreground">
              {t('activeThreadsCount') || 'Threads'}
            </p>
          </div>
        </div>

        {/* Assigned Tasks */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ListTodo className="h-3.5 w-3.5" />
            {t('assignedTasks') || 'Assigned Tasks'}
          </div>
          {data.assignedTodos.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 pl-5">
              {t('noTasks') || 'No tasks assigned'}
            </p>
          ) : (
            <div className="space-y-1">
              {data.assignedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/30 transition-colors"
                >
                  <CheckCircle2
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      todo.status === 'COMPLETED' ? 'text-green-400' : 'text-muted-foreground',
                    )}
                  />
                  <span className="text-xs truncate flex-1">{todo.title}</span>
                  <Badge
                    variant="secondary"
                    className={cn('text-[9px] px-1.5 border-0', STATUS_COLORS[todo.status])}
                  >
                    {todo.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Threads */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            {t('activeThreads') || 'Active Threads'}
          </div>
          {data.activeThreads.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 pl-5">
              {t('noThreads') || 'No active threads'}
            </p>
          ) : (
            <div className="space-y-1">
              {data.activeThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="rounded-md px-2 py-1.5 hover:bg-accent/30 transition-colors space-y-0.5"
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">{thread.fromUser.name}</span>
                    <span className="text-muted-foreground/50">→</span>
                    <span className="text-muted-foreground">{thread.toUser.name}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[9px] px-1.5 border-0 ml-auto',
                        THREAD_STATUS_COLORS[thread.status],
                      )}
                    >
                      {thread.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 truncate">
                    {thread.todo.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ActivityIcon className="h-3.5 w-3.5" />
            {t('recentActivity') || 'Recent Activity'}
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 pl-5">
              {t('noActivity') || 'No recent activity'}
            </p>
          ) : (
            <div className="space-y-1">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
                >
                  <Clock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <span className="text-muted-foreground truncate flex-1">
                    {activity.action.toLowerCase()}{' '}
                    {activity.metadata?.name && `"${activity.metadata.name}"`}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
