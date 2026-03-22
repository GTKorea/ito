'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  Circle,
  CircleDot,
  Ban,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/stores/task-store';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  assignee: { id: string; name: string };
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-zinc-500',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const statusIcons: Record<string, React.ReactNode> = {
  OPEN: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  IN_PROGRESS: <CircleDot className="h-3.5 w-3.5 text-blue-500" />,
  BLOCKED: <Ban className="h-3.5 w-3.5 text-yellow-500" />,
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
};

interface DayDetailDialogProps {
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedTasks: TaskItem[];
  upcomingTasks: TaskItem[];
  externalEvents?: CalendarEvent[];
  onCreateTask?: (date: Date) => void;
  onTaskClick?: (taskId: string) => void;
}

export function DayDetailDialog({
  date,
  open,
  onOpenChange,
  completedTasks,
  upcomingTasks,
  externalEvents,
  onCreateTask,
  onTaskClick,
}: DayDetailDialogProps) {
  const t = useTranslations('calendar');
  const totalTasks = completedTasks.length + upcomingTasks.length;
  const totalEvents = externalEvents?.length || 0;

  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{dateStr}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {totalTasks > 0
              ? `${totalTasks} task${totalTasks > 1 ? 's' : ''}`
              : t('noTasks') || 'No tasks'}
            {totalEvents > 0 && ` · ${totalEvents} event${totalEvents > 1 ? 's' : ''}`}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Upcoming / Active Tasks */}
          {upcomingTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('upcoming') || 'Upcoming'}
                </span>
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px]">
                  {upcomingTasks.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {upcomingTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('completed') || 'Completed'}
                </span>
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px]">
                  {completedTasks.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {completedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </div>
            </div>
          )}

          {/* External Events */}
          {externalEvents && externalEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Events
                </span>
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px]">
                  {externalEvents.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {externalEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      {event.start && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(event.start).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {event.end && (
                            <>
                              {' – '}
                              {new Date(event.end).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalTasks === 0 && totalEvents === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">{t('noTasks') || 'No tasks for this day'}</p>
            </div>
          )}
        </div>

        {/* Add task button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => {
            onOpenChange(false);
            onCreateTask?.(date);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {t('createTask') || 'Add task'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function TaskRow({
  task,
  onClick,
}: {
  task: TaskItem;
  onClick?: (taskId: string) => void;
}) {
  const priorityColor = PRIORITY_COLORS[task.priority] || 'bg-zinc-500';
  const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 transition-colors',
        onClick && 'cursor-pointer hover:bg-accent/50',
        task.status === 'COMPLETED' && 'opacity-60',
      )}
      onClick={() => onClick?.(task.id)}
    >
      {statusIcons[task.status] || statusIcons.OPEN}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            task.status === 'COMPLETED' && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </p>
      </div>
      <span
        className={cn('h-2 w-2 rounded-full shrink-0', priorityColor)}
        title={priorityLabel}
      />
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarFallback className="text-[8px] bg-secondary">
          {task.assignee.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
