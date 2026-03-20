'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TodoItem } from './todo-item';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ThreadLink {
  id: string;
  fromUser: User;
  toUser: User;
  message?: string;
  status: string;
  chainIndex: number;
  groupId?: string;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  creator: User;
  assignee: User;
  threadLinks: ThreadLink[];
  createdAt: string;
}

interface TodoListProps {
  todos: Todo[];
  connectedTodos?: Todo[];
  onSelectTodo?: (id: string, openChat?: boolean) => void;
}

export function TodoList({ todos, connectedTodos, onSelectTodo }: TodoListProps) {
  const t = useTranslations('todos');
  const [connectedExpanded, setConnectedExpanded] = useState(true);

  if (todos.length === 0 && (!connectedTodos || connectedTodos.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">{t('noTasksYet')}</p>
        <p className="text-xs mt-1">{t('createNewToStart')}</p>
      </div>
    );
  }

  const grouped = {
    active: todos.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status)),
    completed: todos.filter((t) => t.status === 'COMPLETED'),
  };

  return (
    <div className="space-y-6">
      {grouped.active.length > 0 && (
        <div className="space-y-1">
          {grouped.active.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} />
          ))}
        </div>
      )}

      {/* Connected Todos - tasks I connected to others */}
      {connectedTodos && connectedTodos.length > 0 && (
        <div>
          <button
            onClick={() => setConnectedExpanded(!connectedExpanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 px-2 hover:text-foreground transition-colors"
          >
            {connectedExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Link2 className="h-3 w-3" />
            {t('connectedTasks', { count: connectedTodos.length })}
          </button>
          {connectedExpanded && (
            <div className="space-y-1">
              {connectedTodos.map((todo) => (
                <div key={todo.id}>
                  <TodoItem todo={todo} onSelect={onSelectTodo} />
                  {/* Current worker badge - below the item */}
                  <div className="flex items-center gap-1.5 ml-10 -mt-1.5 mb-1.5">
                    <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                      <Avatar className="h-3.5 w-3.5">
                        <AvatarFallback className="text-[6px] bg-blue-500/20 text-blue-400">
                          {todo.assignee?.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-blue-400">
                        {todo.assignee?.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {grouped.completed.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 px-2">
            {t('completed')} ({grouped.completed.length})
          </p>
          <div className="space-y-1 opacity-60">
            {grouped.completed.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
