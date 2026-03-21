'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TodoItem } from './todo-item';
import { ChevronDown, ChevronRight, Clock, Eye, EyeOff } from 'lucide-react';
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
  actionRequired: Todo[];
  waiting: Todo[];
  completed: Todo[];
  onSelectTodo?: (id: string, openChat?: boolean) => void;
}

export function TodoList({ actionRequired, waiting, completed, onSelectTodo }: TodoListProps) {
  const t = useTranslations('todos');
  const [waitingExpanded, setWaitingExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  if (actionRequired.length === 0 && waiting.length === 0 && completed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">{t('noTasksYet')}</p>
        <p className="text-xs mt-1">{t('createNewToStart')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Action Required — tasks I need to handle right now */}
      {actionRequired.length > 0 && (
        <div className="space-y-1">
          {actionRequired.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} section="actionRequired" />
          ))}
        </div>
      )}

      {/* Section 2: Waiting — tasks delegated to others, waiting for them */}
      {waiting.length > 0 && (
        <div>
          <button
            onClick={() => setWaitingExpanded(!waitingExpanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 px-2 hover:text-foreground transition-colors"
          >
            {waitingExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Clock className="h-3 w-3" />
            {t('waitingTasks', { count: waiting.length })}
          </button>
          {waitingExpanded && (
            <div className="space-y-1">
              {waiting.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} section="waiting" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Completed — tasks that left my hands */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs text-muted-foreground">
              {t('completedCount', { count: completed.length })}
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
              {completed.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onSelect={onSelectTodo} section="completed" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
