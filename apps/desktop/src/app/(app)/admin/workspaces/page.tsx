'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminStore } from '@/stores/admin-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminWorkspacesPage() {
  const { user } = useAuthStore();
  const { workspaces, isLoading, fetchWorkspaces } = useAdminStore();
  const t = useTranslations('admin');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadWorkspaces = useCallback(() => {
    fetchWorkspaces({ page, limit, search, sortBy, sortOrder });
  }, [fetchWorkspaces, page, limit, search, sortBy, sortOrder]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

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
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{t('workspaces')}</h1>
            <p className="text-xs text-muted-foreground">{t('manageWorkspaces')}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Search & controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('searchWorkspaces')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('name')}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => handleSort('slug')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('slug')}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('members')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('todos')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('teamsCount')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('created')}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <div className="flex justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    </td>
                  </tr>
                ) : workspaces?.data && workspaces.data.length > 0 ? (
                  workspaces.data.map((ws) => (
                    <tr key={ws.id} className="border-b border-border hover:bg-accent/20">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent text-[10px] font-medium">
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[200px] font-medium">{ws.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs font-mono">
                        {ws.slug}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {ws._count.members}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {ws._count.todos}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {ws._count.teams}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {new Date(ws.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      {t('noResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {workspaces && workspaces.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t('showing', {
                from: (page - 1) * limit + 1,
                to: Math.min(page * limit, workspaces.total),
                total: workspaces.total,
              })}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-xs text-muted-foreground">
                {page} / {workspaces.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(workspaces.totalPages, page + 1))}
                disabled={page >= workspaces.totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
