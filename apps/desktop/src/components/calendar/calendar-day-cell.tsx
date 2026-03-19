'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CalendarEvent } from './calendar-event';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus } from 'lucide-react';
import type { CalendarEvent as CalendarEventType } from '@/stores/todo-store';

interface TodoItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  assignee: { id: string; name: string };
}

interface CalendarDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  completedTodos: TodoItem[];
  upcomingTodos: TodoItem[];
  externalEvents?: CalendarEventType[];
  onCreateTodo?: (date: Date) => void;
}

export function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  completedTodos,
  upcomingTodos,
  externalEvents,
  onCreateTodo,
}: CalendarDayCellProps) {
  const [expanded, setExpanded] = useState(false);
  const totalItems = completedTodos.length + upcomingTodos.length;
  const maxVisible = 2;

  return (
    <div
      className={cn(
        'group border-b border-r border-border p-1.5 transition-colors cursor-pointer',
        !isCurrentMonth && 'opacity-30',
        isToday && 'bg-primary/5',
        expanded && 'bg-accent/30',
      )}
      onClick={() => totalItems > 0 && setExpanded(!expanded)}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs',
            isToday
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground',
          )}
        >
          {date.getDate()}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateTodo?.(date); }}
            className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded hover:bg-accent flex items-center justify-center transition-opacity"
          >
            <Plus className="h-3 w-3" />
          </button>
          {totalItems > 0 && !expanded && (
            <>
              {completedTodos.length > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px] bg-green-500/15 text-green-400 border-0">
                  {completedTodos.length}
                </Badge>
              )}
              {upcomingTodos.length > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px] bg-orange-500/15 text-orange-400 border-0">
                  {upcomingTodos.length}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="space-y-0.5">
        {expanded ? (
          <>
            {completedTodos.map((todo) => (
              <CalendarEvent
                key={todo.id}
                title={todo.title}
                type="completed"
                assigneeName={todo.assignee.name}
              />
            ))}
            {upcomingTodos.map((todo) => (
              <CalendarEvent
                key={todo.id}
                title={todo.title}
                type="upcoming"
                assigneeName={todo.assignee.name}
              />
            ))}
            {externalEvents?.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 truncate"
                title={event.title}
              >
                <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{event.title}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            {[...completedTodos, ...upcomingTodos]
              .slice(0, maxVisible)
              .map((todo) => (
                <CalendarEvent
                  key={todo.id}
                  title={todo.title}
                  type={todo.completedAt ? 'completed' : 'upcoming'}
                  assigneeName={todo.assignee.name}
                />
              ))}
            {externalEvents?.slice(0, Math.max(0, maxVisible - completedTodos.length - upcomingTodos.length)).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 truncate"
                title={event.title}
              >
                <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{event.title}</span>
              </div>
            ))}
            {totalItems + (externalEvents?.length || 0) > maxVisible && (
              <p className="text-[10px] text-muted-foreground pl-1">
                +{totalItems + (externalEvents?.length || 0) - maxVisible} more
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
