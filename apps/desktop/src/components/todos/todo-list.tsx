'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TodoItem } from './todo-item';
import { ChevronDown, ChevronRight, Link2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [showCompleted, setShowCompleted] = useState(false);

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
      {/* Section 1: My active tasks (assigned to me) */}
      {grouped.active.length > 0 && (
        <div className="space-y-1">
          {grouped.active.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} />
          ))}
        </div>
      )}

      {/* Section 2: Connected tasks - delegated to others, will come back to me */}
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
                <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} isConnected />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Completed tasks (toggleable) */}
      {grouped.completed.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs text-muted-foreground">
              {t('completed')} ({grouped.completed.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? (
                <><EyeOff className="h-3 w-3 mr-1" />{t('hide')}</>
              ) : (
                <><Eye className="h-3 w-3 mr-1" />{t('show')}</>
              )}
            </Button>
          </div>
          {showCompleted && (
            <div className="space-y-1 opacity-60">
              {grouped.completed.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
