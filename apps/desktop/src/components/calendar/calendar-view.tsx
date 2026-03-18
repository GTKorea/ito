'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDayCell } from './calendar-day-cell';

interface TodoItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  assignee: { id: string; name: string };
}

interface CalendarViewProps {
  year: number;
  month: number; // 0-indexed
  onMonthChange: (year: number, month: number) => void;
  completedTodos: TodoItem[];
  upcomingTodos: TodoItem[];
  isLoading: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Date[] = [];

  // Fill in previous month's trailing days
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Fill in current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Fill in next month's leading days to complete the grid
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarView({
  year,
  month,
  onMonthChange,
  completedTodos,
  upcomingTodos,
  isLoading,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const goToPrevMonth = useCallback(() => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  }, [year, month, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  }, [year, month, onMonthChange]);

  const goToToday = useCallback(() => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth());
  }, [onMonthChange]);

  const monthName = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Build a map of date -> todos for efficient lookup
  const todosByDate = useMemo(() => {
    const map = new Map<
      string,
      { completed: TodoItem[]; upcoming: TodoItem[] }
    >();

    const dateKey = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    for (const todo of completedTodos) {
      if (!todo.completedAt) continue;
      const d = new Date(todo.completedAt);
      const key = dateKey(d);
      if (!map.has(key)) map.set(key, { completed: [], upcoming: [] });
      map.get(key)!.completed.push(todo);
    }

    for (const todo of upcomingTodos) {
      if (!todo.dueDate) continue;
      const d = new Date(todo.dueDate);
      const key = dateKey(d);
      if (!map.has(key)) map.set(key, { completed: [], upcoming: [] });
      map.get(key)!.upcoming.push(todo);
    }

    return map;
  }, [completedTodos, upcomingTodos]);

  return (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <div className="flex items-center justify-between px-1 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{monthName}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs h-7 px-2">
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex-1 border-t border-l border-border rounded-lg overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="border-b border-r border-border px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground bg-card"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((date, i) => {
              const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              const dayTodos = todosByDate.get(key) || {
                completed: [],
                upcoming: [],
              };

              return (
                <CalendarDayCell
                  key={i}
                  date={date}
                  isCurrentMonth={date.getMonth() === month}
                  isToday={isSameDay(date, today)}
                  completedTodos={dayTodos.completed}
                  upcomingTodos={dayTodos.upcoming}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
