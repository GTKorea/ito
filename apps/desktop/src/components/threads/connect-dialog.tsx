'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
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
import { Link2 } from 'lucide-react';

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
  const [selected, setSelected] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { connectThread, fetchTodos } = useTodoStore();
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

  const handleConnect = async () => {
    if (!selected || !currentWorkspace) return;
    setIsLoading(true);
    try {
      await connectThread(todoId, selected.id, message || undefined);
      await fetchTodos(currentWorkspace.id);
      onClose();
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

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
          {!selected ? (
            <>
              <Input
                placeholder={t('searchByNameOrEmail')}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {members.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelected(user)}
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
                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noMembersFound')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-md bg-accent p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary">
                    {selected.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs"
                  onClick={() => setSelected(null)}
                >
                  {tc('change')}
                </Button>
              </div>

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
                {isLoading ? t('connecting') : t('connectThread')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
