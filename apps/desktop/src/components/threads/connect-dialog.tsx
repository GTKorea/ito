'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/stores/task-store';
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
import { Link2, X, Users, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface ConnectDialogProps {
  taskId: string;
  onClose: () => void;
}

type ConnectMode = 'person' | 'blocker';

export function ConnectDialog({ taskId, onClose }: ConnectDialogProps) {
  const [mode, setMode] = useState<ConnectMode>('person');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [blockerNote, setBlockerNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { connectThread, connectMultiThread, connectBlocker, fetchCategorizedTasks } = useTaskStore();
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
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      if (mode === 'blocker') {
        if (!blockerNote.trim()) return;
        await connectBlocker(taskId, blockerNote.trim());
      } else {
        if (selected.length === 0) return;
        if (selected.length === 1) {
          await connectThread(taskId, selected[0].id, message || undefined);
        } else {
          await connectMultiThread(
            taskId,
            selected.map((u) => u.id),
            message || undefined,
          );
        }
      }
      await fetchCategorizedTasks(currentWorkspace.id);
      onClose();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (m) => !selected.find((s) => s.id === m.id),
  );

  const canSubmit = mode === 'blocker'
    ? blockerNote.trim().length > 0
    : selected.length > 0;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'blocker' ? (
              <ShieldAlert className="h-4 w-4 text-red-500" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {mode === 'blocker' ? t('addBlocker') : t('connectThread')}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setMode('person')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'person'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {t('person')}
          </button>
          <button
            onClick={() => setMode('blocker')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'blocker'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {t('blocker')}
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'person' ? (
            <>
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

              {/* Message */}
              {selected.length > 0 && (
                <Textarea
                  placeholder={t('addMessage')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                />
              )}
            </>
          ) : (
            /* Blocker mode */
            <>
              <p className="text-xs text-muted-foreground">
                {t('blockerDescription')}
              </p>
              <Textarea
                placeholder={t('blockerPlaceholder')}
                value={blockerNote}
                onChange={(e) => setBlockerNote(e.target.value)}
                rows={3}
                autoFocus
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {blockerNote.length}/500
              </p>
            </>
          )}

          {/* Submit button */}
          {canSubmit && (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className={cn('w-full', mode === 'blocker' && 'bg-red-600 hover:bg-red-700')}
            >
              {mode === 'blocker' ? (
                <ShieldAlert className="mr-2 h-4 w-4" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              {isLoading
                ? t('connecting')
                : mode === 'blocker'
                  ? t('addBlocker')
                  : selected.length > 1
                    ? t('connectMultiple', { count: selected.length })
                    : t('connectThread')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
