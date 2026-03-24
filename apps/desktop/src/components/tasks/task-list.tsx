'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TaskItem } from './task-item';
import { ChevronDown, ChevronRight, Clock, CheckCircle } from 'lucide-react';

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
  onSelectTask?: (id: string, openChat?: boolean) => void;
  sortBy?: string;
  workspaceId?: string;
  isSelecting?: boolean;
  selectedTaskIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function TaskList({ actionRequired, waiting, completed, onSelectTask, sortBy, workspaceId, isSelecting, selectedTaskIds, onToggleSelect }: TaskListProps) {
  const t = useTranslations('tasks');
  const { reorderTasks } = useTaskStore();
  const [waitingExpanded, setWaitingExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

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
