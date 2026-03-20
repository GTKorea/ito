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
  Link2,
} from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500/10 text-blue-400',
  IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400',
  BLOCKED: 'bg-red-500/10 text-red-400',
  COMPLETED: 'bg-green-500/10 text-green-400',
  CANCELLED: 'bg-gray-500/10 text-gray-400',
};

const priorityColors: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-green-400',
};

export default function AdminTodosPage() {
  const { user } = useAuthStore();
  const { todos, isLoading, fetchTodos } = useAdminStore();
  const t = useTranslations('admin');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('');

  const loadTodos = useCallback(() => {
    const params: Record<string, string | number> = { page, limit, sortBy, sortOrder };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    fetchTodos(params);
  }, [fetchTodos, page, limit, search, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

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
            <h1 className="text-lg font-semibold">{t('todos')}</h1>
            <p className="text-xs text-muted-foreground">{t('manageTodos')}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Search & filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('searchTodos')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="OPEN">{t('status_OPEN')}</option>
            <option value="IN_PROGRESS">{t('status_IN_PROGRESS')}</option>
            <option value="BLOCKED">{t('status_BLOCKED')}</option>
            <option value="COMPLETED">{t('status_COMPLETED')}</option>
            <option value="CANCELLED">{t('status_CANCELLED')}</option>
          </select>
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
                      onClick={() => handleSort('title')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('todoTitle')}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('status')}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => handleSort('priority')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {t('priority')}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('assignee')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('workspace')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {t('threads')}
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
                    <td colSpan={7} className="py-8 text-center">
                      <div className="flex justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    </td>
                  </tr>
                ) : todos?.data && todos.data.length > 0 ? (
                  todos.data.map((todo) => (
                    <tr key={todo.id} className="border-b border-border hover:bg-accent/20">
                      <td className="px-3 py-2">
                        <span className="truncate max-w-[200px] block">{todo.title}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            statusColors[todo.status] || ''
                          }`}
                        >
                          {t(`status_${todo.status}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs ${priorityColors[todo.priority] || ''}`}>
                          {todo.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[120px]">
                        {todo.assignee?.name || '-'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[120px]">
                        {todo.workspace?.name || '-'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {todo._count.threadLinks > 0 && (
                          <span className="flex items-center gap-1 text-xs">
                            <Link2 className="h-3 w-3" />
                            {todo._count.threadLinks}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {new Date(todo.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                      {t('noResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {todos && todos.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t('showing', {
                from: (page - 1) * limit + 1,
                to: Math.min(page * limit, todos.total),
                total: todos.total,
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
                {page} / {todos.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(todos.totalPages, page + 1))}
                disabled={page >= todos.totalPages}
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
