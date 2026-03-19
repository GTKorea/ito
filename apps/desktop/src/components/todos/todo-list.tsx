'use client';

import { useTranslations } from 'next-intl';
import { TodoItem } from './todo-item';

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
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  creator: User;
  assignee: User;
  threadLinks: ThreadLink[];
  createdAt: string;
}

interface TodoListProps {
  todos: Todo[];
  onSelectTodo?: (id: string) => void;
}

export function TodoList({ todos, onSelectTodo }: TodoListProps) {
  const t = useTranslations('todos');

  if (todos.length === 0) {
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
