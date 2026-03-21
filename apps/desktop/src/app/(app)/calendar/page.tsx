'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { CalendarView } from '@/components/calendar/calendar-view';
import { QuickCreateTaskDialog } from '@/components/calendar/quick-create-task-dialog';
import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';


export default function CalendarPage() {
  const t = useTranslations('calendar');
  const { currentWorkspace } = useWorkspaceStore();
  const { calendarData, calendarLoading, fetchCalendarTasks, calendarEvents, fetchCalendarEvents } = useTaskStore();

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

    fetchCalendarTasks(currentWorkspace.id, startISO, endISO);
    fetchCalendarEvents(startISO, endISO);
  }, [currentWorkspace, year, month, fetchCalendarTasks, fetchCalendarEvents]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {!currentWorkspace ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarDays className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{t('noWorkspace')}</p>
          </div>
        ) : (
          <CalendarView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            completedTasks={calendarData?.completed || []}
            upcomingTasks={calendarData?.upcoming || []}
            isLoading={calendarLoading}
            externalEvents={calendarEvents}
            onCreateTask={(date) => setCreateDate(date)}
          />
        )}
      </div>


      {createDate && (
        <QuickCreateTaskDialog
          date={createDate}
          open={!!createDate}
          onOpenChange={(open) => { if (!open) setCreateDate(null); }}
          onCreated={() => {
            if (currentWorkspace) {
              const start = new Date(year, month, 1);
              start.setDate(start.getDate() - 7);
              const end = new Date(year, month + 1, 0);
              end.setDate(end.getDate() + 7);
              fetchCalendarTasks(currentWorkspace.id, start.toISOString(), end.toISOString());
            }
          }}
        />
      )}
    </div>
  );
}
