'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { CalendarView } from '@/components/calendar/calendar-view';
import { QuickCreateTaskDialog } from '@/components/calendar/quick-create-task-dialog';
import { DayDetailDialog } from '@/components/calendar/day-detail-dialog';
import { TaskDetail } from '@/components/tasks/task-detail';
import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';


export default function CalendarPage() {
  const t = useTranslations('calendar');
  const { currentWorkspace } = useWorkspaceStore();
  const { calendarData, calendarLoading, fetchCalendarTasks, calendarEvents, fetchCalendarEvents } = useTaskStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDrawerVisible(true);
  };

  const handleCloseTask = () => {
    setDrawerVisible(false);
    setTimeout(() => setSelectedTaskId(null), 200);
  };

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
            onDayClick={(date) => setDetailDate(date)}
          />
        )}
      </div>


      {detailDate && (
        <DayDetailDialog
          date={detailDate}
          open={!!detailDate}
          onOpenChange={(open) => { if (!open) setDetailDate(null); }}
          completedTasks={(calendarData?.completed || []).filter((task) => {
            if (!task.completedAt) return false;
            const d = new Date(task.completedAt);
            return d.getFullYear() === detailDate.getFullYear() &&
              d.getMonth() === detailDate.getMonth() &&
              d.getDate() === detailDate.getDate();
          })}
          upcomingTasks={(calendarData?.upcoming || []).filter((task) => {
            if (!task.dueDate) return false;
            const d = new Date(task.dueDate);
            return d.getFullYear() === detailDate.getFullYear() &&
              d.getMonth() === detailDate.getMonth() &&
              d.getDate() === detailDate.getDate();
          })}
          externalEvents={(calendarEvents || []).filter((event) => {
            if (!event.start) return false;
            const d = new Date(event.start);
            return d.getFullYear() === detailDate.getFullYear() &&
              d.getMonth() === detailDate.getMonth() &&
              d.getDate() === detailDate.getDate();
          })}
          onCreateTask={(date) => {
            setDetailDate(null);
            setCreateDate(date);
          }}
          onTaskClick={handleSelectTask}
        />
      )}

      {/* Task Detail Backdrop — above the dialog overlay (z-50) */}
      {selectedTaskId && (
        <div
          className={cn(
            'fixed inset-0 z-[60] transition-opacity duration-200',
            drawerVisible ? 'bg-black/30 opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onClick={handleCloseTask}
        />
      )}

      {/* Task Detail Slide-over */}
      <div
        className={cn(
          'fixed right-0 top-0 z-[70] h-full w-full md:w-[420px] transition-transform duration-200 ease-out',
          drawerVisible ? 'translate-x-0' : 'translate-x-full',
          !selectedTaskId && 'pointer-events-none',
        )}
      >
        {selectedTaskId && (
          <TaskDetail
            taskId={selectedTaskId}
            onClose={handleCloseTask}
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
