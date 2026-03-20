'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Link2, X, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface ConnectDialogProps {
  todoId: string;
  onClose: () => void;
}

export function ConnectDialog({ todoId, onClose }: ConnectDialogProps) {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { connectThread, connectMultiThread, fetchTodos } = useTodoStore();
  const { currentWorkspace } = useWorkspaceStore();
  const t = useTranslations('threads');
  const tc = useTranslations('common');

  // Load workspace members on mount
  useEffect(() => {
    if (!currentWorkspace) return;
    const loadMembers = async () => {
      try {
        const { data } = await api.get('/users/search', {
          params: { workspaceId: currentWorkspace.id },
        });
        setMembers(data);
      } catch {
        setMembers([]);
      }
    };
    loadMembers();
  }, [currentWorkspace]);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!currentWorkspace) return;
    try {
      const { data } = await api.get('/users/search', {
        params: {
          workspaceId: currentWorkspace.id,
          ...(query.length > 0 ? { query } : {}),
        },
      });
      setMembers(data);
    } catch {
      setMembers([]);
    }
  };

  const toggleUser = (user: User) => {
    setSelected((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      }
      if (prev.length >= 10) return prev; // max 10
      return [...prev, user];
    });
  };

  const removeUser = (userId: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleConnect = async () => {
    if (selected.length === 0 || !currentWorkspace) return;
    setIsLoading(true);
    try {
      if (selected.length === 1) {
        // Single connect — backward compatible
        await connectThread(todoId, selected[0].id, message || undefined);
      } else {
        // Multi-connect
        await connectMultiThread(
          todoId,
          selected.map((u) => u.id),
          message || undefined,
        );
      }
      await fetchTodos(currentWorkspace.id);
      onClose();
    } catch (error) {
      console.error('Failed to connect thread:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (m) => !selected.find((s) => s.id === m.id),
  );

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t('connectThread')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected users as chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="flex items-center gap-1 pl-1 pr-1 py-1"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[7px] bg-secondary">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{user.name}</span>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="ml-0.5 rounded-sm hover:bg-accent p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selected.length > 1 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t('parallelConnect', { count: selected.length })}
                </span>
              )}
            </div>
          )}

          {/* Search and member list */}
          <Input
            placeholder={t('searchByNameOrEmail')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredMembers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleUser(user)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px] bg-secondary">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            ))}
            {filteredMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('noMembersFound')}
              </p>
            )}
          </div>

          {/* Message and connect button */}
          {selected.length > 0 && (
            <>
              <Textarea
                placeholder={t('addMessage')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />

              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full"
              >
                <Link2 className="mr-2 h-4 w-4" />
                {isLoading
                  ? t('connecting')
                  : selected.length > 1
                    ? t('connectMultiple', { count: selected.length })
                    : t('connectThread')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
