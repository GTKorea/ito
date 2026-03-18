'use client';

import { useState } from 'react';
import { useTodoStore } from '@/stores/todo-store';
import { ThreadChain } from '@/components/threads/thread-chain';
import { ConnectDialog } from '@/components/threads/connect-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  Link2,
  MoreHorizontal,
  Trash2,
  Circle,
  CircleDot,
  Ban,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  URGENT: 'text-red-500',
  HIGH: 'text-orange-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-blue-500',
};

const statusIcons: Record<string, React.ReactNode> = {
  OPEN: <Circle className="h-4 w-4 text-muted-foreground" />,
  IN_PROGRESS: <CircleDot className="h-4 w-4 text-blue-500" />,
  BLOCKED: <Ban className="h-4 w-4 text-yellow-500" />,
  COMPLETED: <Check className="h-4 w-4 text-green-500" />,
};

function getDueDateInfo(dueDate?: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: 'Overdue', color: 'text-red-500' };
  if (diff === 0) return { text: 'Due today', color: 'text-yellow-500' };
  if (diff === 1) return { text: 'Due tomorrow', color: 'text-yellow-500' };
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: 'text-muted-foreground',
  };
}

interface TodoItemProps {
  todo: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    creator: { id: string; name: string; avatarUrl?: string };
    assignee: { id: string; name: string; avatarUrl?: string };
    threadLinks: Array<{
      id: string;
      fromUser: { id: string; name: string; avatarUrl?: string };
      toUser: { id: string; name: string; avatarUrl?: string };
      message?: string;
      status: string;
      chainIndex: number;
    }>;
  };
  onSelect?: (id: string) => void;
}

export function TodoItem({ todo, onSelect }: TodoItemProps) {
  const [showConnect, setShowConnect] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const { updateTodo, deleteTodo, resolveThread } = useTodoStore();

  const handleResolve = async (linkId: string) => {
    if (isResolving) return;
    setIsResolving(true);
    try {
      await resolveThread(linkId);
    } catch {
      setIsResolving(false);
    }
  };

  const hasThreads = todo.threadLinks.length > 0;
  const dueDateInfo = getDueDateInfo(todo.dueDate);
  const pendingLink = todo.threadLinks.find(
    (l) => l.status === 'PENDING' && l.toUser.id === todo.assignee.id,
  );

  return (
    <div className="group rounded-lg border border-border bg-card p-3 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-3">
        {/* Status icon / toggle */}
        <button
          onClick={() =>
            updateTodo(todo.id, {
              status: todo.status === 'COMPLETED' ? 'OPEN' : 'COMPLETED',
            })
          }
          className="shrink-0"
        >
          {statusIcons[todo.status] || statusIcons.OPEN}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect?.(todo.id)}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                todo.status === 'COMPLETED' && 'line-through text-muted-foreground',
              )}
            >
              {todo.title}
            </span>
            <span className={cn('text-xs', priorityColors[todo.priority])}>
              {todo.priority[0]}
            </span>
            {hasThreads && (
              <Badge
                variant="outline"
                className="h-5 text-[10px] gap-1 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                <Link2 className="h-3 w-3" />
                {todo.threadLinks.length}
              </Badge>
            )}
          </div>

          {todo.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {todo.description}
            </p>
          )}
          {dueDateInfo && (
            <div className={cn('flex items-center gap-1 mt-0.5', dueDateInfo.color)}>
              <Calendar className="h-3 w-3" />
              <span className="text-[10px]">{dueDateInfo.text}</span>
            </div>
          )}
        </div>

        {/* Assignee */}
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarFallback className="text-[9px] bg-secondary">
            {todo.assignee.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {pendingLink && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-green-500 hover:text-green-400"
              disabled={isResolving}
              onClick={() => handleResolve(pendingLink.id)}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {isResolving ? 'Resolving...' : 'Done'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowConnect(true)}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Connect
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteTodo(todo.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Thread chain visualization */}
      {expanded && hasThreads && (
        <div className="mt-3 ml-7">
          <ThreadChain links={todo.threadLinks} creator={todo.creator} />
        </div>
      )}

      {/* Connect dialog */}
      {showConnect && (
        <ConnectDialog
          todoId={todo.id}
          onClose={() => setShowConnect(false)}
        />
      )}
    </div>
  );
}
