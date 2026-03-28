'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TaskItem } from './task-item';
import { ChevronDown, ChevronRight, Clock, CheckCircle, Calendar, X } from 'lucide-react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useTaskStore } from '@/stores/task-store';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ThreadLink {
  id: string;
  fromUser: User;
  toUser: User | null;
  type?: 'PERSON' | 'BLOCKER';
  blockerNote?: string;
  message?: string;
  status: string;
  chainIndex: number;
  groupId?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type?: string;
  voteConfig?: any;
  dueDate?: string;
  order?: number;
  creator: User;
  assignee: User;
  taskGroup?: { id: string; name: string } | null;
  threadLinks: ThreadLink[];
  createdAt: string;
  _count?: { files: number; chatMessages: number };
  unreadChatCount?: number;
}

interface TaskListProps {
  actionRequired: Task[];
  waiting: Task[];
  completed: Task[];
  meetings?: Task[];
  dismissedMeetingIds?: string[];
  onSelectTask?: (id: string, openChat?: boolean) => void;
  sortBy?: string;
  workspaceId?: string;
  isSelecting?: boolean;
  selectedTaskIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  currentGroupId?: string;
}

export function TaskList({ actionRequired, waiting, completed, meetings = [], dismissedMeetingIds = [], onSelectTask, sortBy, workspaceId, isSelecting, selectedTaskIds, onToggleSelect, currentGroupId }: TaskListProps) {
  const t = useTranslations('tasks');
  const { reorderTasks, dismissMeeting, restoreMeeting } = useTaskStore();
  const [waitingExpanded, setWaitingExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [meetingsExpanded, setMeetingsExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !workspaceId) return;
    const oldIndex = actionRequired.findIndex((t) => t.id === active.id);
    const newIndex = actionRequired.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(actionRequired.map((t) => t.id), oldIndex, newIndex);
    reorderTasks(workspaceId, newOrder);
  };

  if (actionRequired.length === 0 && waiting.length === 0 && completed.length === 0 && meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">{t('noTasksYet')}</p>
        <p className="text-xs mt-1">{t('createNewToStart')}</p>
      </div>
    );
  }

  const visibleMeetings = meetings.filter((m) => !dismissedMeetingIds.includes(m.id));
  const hiddenMeetingCount = meetings.length - visibleMeetings.length;

  return (
    <div className="space-y-6">
      {/* Section 0: Upcoming Meetings — pinned announcement section */}
      {meetings.length > 0 && (
        <div>
          <button
            onClick={() => setMeetingsExpanded(!meetingsExpanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-2 px-2 hover:text-emerald-300 transition-colors"
          >
            {meetingsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Calendar className="h-3 w-3" />
            {t('upcomingMeetings', { count: visibleMeetings.length })}
          </button>
          {meetingsExpanded && (
            <div className="space-y-1.5 mb-2">
              {visibleMeetings.map((meeting) => {
                const config = meeting.voteConfig;
                const scheduledDate = config?.scheduledAt ? new Date(config.scheduledAt) : null;
                return (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                    onClick={() => onSelectTask?.(meeting.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-sm font-medium truncate">{meeting.title}</span>
                      {scheduledDate && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {scheduledDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {' '}
                          {scheduledDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissMeeting(meeting.id);
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5 shrink-0"
                      title={t('dismissMeeting')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {hiddenMeetingCount > 0 && (
                <button
                  onClick={() => {
                    dismissedMeetingIds.forEach((id) => restoreMeeting(id));
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 transition-colors"
                >
                  {t('hiddenMeetings', { count: hiddenMeetingCount })} — {t('restoreMeetings')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 1: Action Required — tasks I need to handle right now */}
      {actionRequired.length > 0 && (
        <div className="space-y-1">
          {sortBy === 'custom' ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={actionRequired.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {actionRequired.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onSelect={onSelectTask}
                    section="actionRequired"
                    isDraggable
                    isSelecting={isSelecting}
                    isSelected={selectedTaskIds?.has(task.id)}
                    onToggleSelect={onToggleSelect}
                    currentGroupId={currentGroupId}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            actionRequired.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onSelect={onSelectTask}
                section="actionRequired"
                isSelecting={isSelecting}
                isSelected={selectedTaskIds?.has(task.id)}
                onToggleSelect={onToggleSelect}
                currentGroupId={currentGroupId}
              />
            ))
          )}
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
              {waiting.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onSelect={onSelectTask}
                  section="waiting"
                  isSelecting={isSelecting}
                  isSelected={selectedTaskIds?.has(task.id)}
                  onToggleSelect={onToggleSelect}
                  currentGroupId={currentGroupId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Completed — tasks that left my hands */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 px-2 hover:text-foreground transition-colors"
          >
            {showCompleted ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <CheckCircle className="h-3 w-3" />
            {t('completedCount', { count: completed.length })}
          </button>
          {showCompleted && (
            <div className="space-y-1 opacity-60">
              {completed.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onSelect={onSelectTask}
                  section="completed"
                  isSelecting={isSelecting}
                  isSelected={selectedTaskIds?.has(task.id)}
                  currentGroupId={currentGroupId}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
