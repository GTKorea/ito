'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminStore } from '@/stores/admin-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';

export default function UsersPage() {
  const { users, isLoading, fetchUsers, updateUser } = useAdminStore();
  const t = useTranslations('admin');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    fetchUsers({ page, limit, search, sortBy, sortOrder });
  }, [fetchUsers, page, limit, search, sortBy, sortOrder]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateUser(userId, { role: newRole });
    setEditingRole(null);
    loadUsers();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('users')}</h1>
          <p className="text-xs text-muted-foreground">{t('manageUsers')}</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('searchUsers')}
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

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                      {t('name')} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-foreground">
                      {t('email')} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button onClick={() => handleSort('role')} className="flex items-center gap-1 hover:text-foreground">
                      {t('role')} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('workspaces')}</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('todos')}</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-foreground">
                      {t('joined')} <ArrowUpDown className="h-3 w-3" />
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
                ) : users?.data && users.data.length > 0 ? (
                  users.data.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-accent/20">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[150px]">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{u.email}</td>
                      <td className="px-3 py-2">
                        {editingRole === u.id ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            onBlur={() => setEditingRole(null)}
                            autoFocus
                            className="h-6 rounded border border-border bg-card px-1 text-xs"
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingRole(u.id)}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-500/10 text-purple-400'
                                : 'bg-accent text-muted-foreground'
                            }`}
                          >
                            {u.role}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{u._count.workspaceMembers}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u._count.todosAssigned}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">{t('noResults')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {users && users.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t('showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, users.total), total: users.total })}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="h-7 w-7 p-0">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-xs text-muted-foreground">{page} / {users.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(users.totalPages, page + 1))} disabled={page >= users.totalPages} className="h-7 w-7 p-0">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
