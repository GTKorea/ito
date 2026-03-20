'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAdminStore } from '@/stores/admin-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  Shield,
  Users,
  Building2,
  CheckSquare,
  Link2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  trend?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] text-green-500">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const { stats, activities, isLoading, fetchStats, fetchActivities } = useAdminStore();
  const t = useTranslations('admin');

  useEffect(() => {
    fetchStats();
    fetchActivities({ limit: 10 });
  }, [fetchStats, fetchActivities]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">{t('accessDenied')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        {isLoading && !stats ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={t('totalUsers')}
              value={stats.totalUsers}
              icon={Users}
              trend={`${stats.activeUsers} ${t('activeThisWeek')}`}
              href="/admin/users"
            />
            <StatCard
              label={t('totalWorkspaces')}
              value={stats.totalWorkspaces}
              icon={Building2}
              href="/admin/workspaces"
            />
            <StatCard
              label={t('totalTodos')}
              value={stats.totalTodos}
              icon={CheckSquare}
              href="/admin/todos"
            />
            <StatCard
              label={t('totalThreads')}
              value={stats.totalThreads}
              icon={Link2}
            />
          </div>
        ) : null}

        {/* Todo status breakdown */}
        {stats?.todosByStatus && Object.keys(stats.todosByStatus).length > 0 && (
          <div>
            <h2 className="text-sm font-medium mb-3">{t('todosByStatus')}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'].map((status) => (
                <div
                  key={status}
                  className="rounded-md border border-border bg-card px-3 py-2"
                >
                  <p className="text-lg font-semibold">
                    {stats.todosByStatus[status] || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t(`status_${status}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">{t('recentActivity')}</h2>
          </div>
          {activities?.data && activities.data.length > 0 ? (
            <div className="space-y-2">
              {activities.data.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium">
                    {activity.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      <span className="text-muted-foreground">
                        {activity.action.toLowerCase()} {activity.entityType.toLowerCase()}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {activity.workspace.name} &middot;{' '}
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('noActivity')}
            </p>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { href: '/admin/users', label: t('manageUsers'), icon: Users },
            { href: '/admin/workspaces', label: t('manageWorkspaces'), icon: Building2 },
            { href: '/admin/todos', label: t('manageTodos'), icon: CheckSquare },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm hover:bg-accent/30 transition-colors"
            >
              <link.icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{link.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
