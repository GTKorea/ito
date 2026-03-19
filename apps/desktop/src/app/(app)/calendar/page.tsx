'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { CalendarView } from '@/components/calendar/calendar-view';
import { QuickCreateTodoDialog } from '@/components/calendar/quick-create-todo-dialog';
import { CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { calendarData, calendarLoading, fetchCalendarTodos, calendarEvents, fetchCalendarEvents } = useTodoStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [createDate, setCreateDate] = useState<Date | null>(null);

  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  }, []);

  useEffect(() => {
    if (!currentWorkspace) return;

    // Fetch from first day of month to last day of month (with some buffer for grid display)
    const start = new Date(year, month, 1);
    start.setDate(start.getDate() - 7); // buffer for prev month days shown
    const end = new Date(year, month + 1, 0);
    end.setDate(end.getDate() + 7); // buffer for next month days shown

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    fetchCalendarTodos(currentWorkspace.id, startISO, endISO);
    fetchCalendarEvents(startISO, endISO);
  }, [currentWorkspace, year, month, fetchCalendarTodos, fetchCalendarEvents]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Calendar</h1>
          <p className="text-xs text-muted-foreground">
            Track deadlines and completed tasks
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {!currentWorkspace ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarDays className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Select a workspace to view calendar</p>
          </div>
        ) : (
          <CalendarView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            completedTodos={calendarData?.completed || []}
            upcomingTodos={calendarData?.upcoming || []}
            isLoading={calendarLoading}
            externalEvents={calendarEvents}
            onCreateTodo={(date) => setCreateDate(date)}
          />
        )}
      </div>

      {createDate && (
        <QuickCreateTodoDialog
          date={createDate}
          open={!!createDate}
          onOpenChange={(open) => { if (!open) setCreateDate(null); }}
          onCreated={() => {
            if (currentWorkspace) {
              const start = new Date(year, month, 1);
              start.setDate(start.getDate() - 7);
              const end = new Date(year, month + 1, 0);
              end.setDate(end.getDate() + 7);
              fetchCalendarTodos(currentWorkspace.id, start.toISOString(), end.toISOString());
            }
          }}
        />
      )}
    </div>
  );
}
