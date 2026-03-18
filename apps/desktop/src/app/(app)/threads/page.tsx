'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Check,
  Link2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ThreadLink {
  id: string;
  fromUser?: User;
  toUser?: User;
  message?: string;
  status: string;
  chainIndex: number;
  createdAt: string;
  todo: {
    id: string;
    title: string;
    priority: string;
  };
}

interface MyThreads {
  incoming: ThreadLink[];
  outgoing: ThreadLink[];
}

export default function ThreadsPage() {
  const [threads, setThreads] = useState<MyThreads>({ incoming: [], outgoing: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const { resolveThread } = useTodoStore();
  const { currentWorkspace } = useWorkspaceStore();

  const fetchThreads = async () => {
    if (!currentWorkspace) return;
    try {
      const { data } = await api.get('/threads/mine', {
        params: { workspaceId: currentWorkspace.id },
      });
      setThreads(data);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchThreads();
    } else {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  const handleResolve = async (id: string) => {
    await resolveThread(id);
    fetchThreads();
  };

  const list = tab === 'incoming' ? threads.incoming : threads.outgoing;

  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Threads</h1>
          <p className="text-xs text-muted-foreground">
            Track tasks connected to you
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border px-6">
        <button
          onClick={() => setTab('incoming')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors',
            tab === 'incoming'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <ArrowDownLeft className="h-3.5 w-3.5" />
          Incoming
          {threads.incoming.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
              {threads.incoming.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setTab('outgoing')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors',
            tab === 'outgoing'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Outgoing
          {threads.outgoing.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
              {threads.outgoing.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Link2 className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">
              {tab === 'incoming'
                ? 'No threads waiting for you'
                : 'No threads you\'ve sent out'}
            </p>
          </div>
        ) : (
          list.map((link) => (
            <div
              key={link.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] bg-secondary">
                      {((tab === 'incoming' ? link.fromUser?.name : link.toUser?.name) || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {tab === 'incoming' ? link.fromUser?.name : link.toUser?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tab === 'incoming' ? 'asked you to handle' : 'is handling your request'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    link.status === 'PENDING' && 'border-yellow-500/50 text-yellow-500',
                    link.status === 'COMPLETED' && 'border-green-500/50 text-green-500',
                    link.status === 'FORWARDED' && 'border-blue-500/50 text-blue-500',
                  )}
                >
                  {link.status}
                </Badge>
              </div>

              {/* Todo info */}
              <div className="rounded-md bg-accent/50 px-3 py-2">
                <p className="text-sm font-medium">{link.todo.title}</p>
              </div>

              {link.message && (
                <p className="text-xs text-muted-foreground italic">
                  &quot;{link.message}&quot;
                </p>
              )}

              {/* Actions */}
              {tab === 'incoming' && link.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => handleResolve(link.id)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Mark Done
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
