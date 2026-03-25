'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskStore } from '@/stores/task-store';
import type { VoteConfig } from '@/stores/task-store';
import { useAuthStore } from '@/stores/auth-store';
import { ThreadChain } from '@/components/threads/thread-chain';
import { ConnectDialog } from '@/components/threads/connect-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserProfilePopover } from '@/components/user/user-profile-popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  Link2,
  MoreHorizontal,
  Trash2,
  Circle,
  CircleDot,
  Ban,
  Calendar as CalendarIcon,
  X,
  MessageCircle,
  User,
  ShieldAlert,
  Flag,
  GripVertical,
  Vote,
  ArrowDownFromLine,
  Paperclip,
  Bell,
  Hash,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMediaQuery } from '@/hooks/use-media-query';

// Status names are now translated via useTranslations

const statusIcons: Record<string, React.ReactNode> = {
  OPEN: <Circle className="h-4 w-4 text-muted-foreground" />,
  IN_PROGRESS: <CircleDot className="h-4 w-4 text-blue-500" />,
  BLOCKED: <Ban className="h-4 w-4 text-yellow-500" />,
  COMPLETED: <Check className="h-4 w-4 text-green-500" />,
};

const priorityConfig: Record<string, { color: string }> = {
  URGENT: { color: 'text-red-400' },
  HIGH: { color: 'text-orange-400' },
  LOW: { color: 'text-blue-400' },
};

type TaskSection = 'actionRequired' | 'waiting' | 'completed';

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    type?: string;
    voteConfig?: VoteConfig;
    creator: { id: string; name: string; avatarUrl?: string };
    assignee?: { id: string; name: string; avatarUrl?: string };
    taskGroup?: { id: string; name: string } | null;
    threadLinks: Array<{
      id: string;
      fromUser: { id: string; name: string; avatarUrl?: string };
      toUser: { id: string; name: string; avatarUrl?: string } | null;
      type?: 'PERSON' | 'BLOCKER';
      blockerNote?: string;
      message?: string;
      status: string;
      chainIndex: number;
      groupId?: string;
    }>;
    _count?: { files: number; chatMessages: number };
    unreadChatCount?: number;
  };
  onSelect?: (id: string, openChat?: boolean) => void;
  section: TaskSection;
  isDraggable?: boolean;
  isSelecting?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  currentGroupId?: string;
}

export function TaskItem({
  task,
  onSelect,
  section,
  isDraggable,
  isSelecting,
  isSelected,
  onToggleSelect,
  currentGroupId,
}: TaskItemProps) {
  const [showConnect, setShowConnect] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const {
    updateTask,
    deleteTask,
    resolveThread,
    resolveBlocker,
    declineThread,
    pullThread,
    pullCurrentAssignee,
  } = useTaskStore();
  const { user } = useAuthStore();
  const { isMobile } = useMediaQuery();
  const t = useTranslations('tasks');
  const tc = useTranslations('common');
  const statusNames: Record<string, string> = {
    OPEN: t('statusOpen'),
    IN_PROGRESS: t('statusInProgress'),
    BLOCKED: t('statusBlocked'),
    COMPLETED: t('statusCompleted'),
  };

  const handleResolve = async (linkId: string) => {
    if (isResolving) return;
    setIsResolving(true);
    try {
      await resolveThread(linkId);
    } catch {
      setIsResolving(false);
    }
  };

  const handleDecline = async (linkId: string) => {
    if (isDeclining) return;
    setIsDeclining(true);
    try {
      await declineThread(linkId, declineReason || undefined);
      setShowDecline(false);
      setDeclineReason('');
    } catch {
      setIsDeclining(false);
    }
  };

  function getDueDateInfo(dueDate?: string) {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return { text: t('overdue'), color: 'text-red-500' };
    if (diff === 0) return { text: t('dueToday'), color: 'text-yellow-500' };
    if (diff === 1) return { text: t('dueTomorrow'), color: 'text-yellow-500' };
    return {
      text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-muted-foreground',
    };
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const hasThreads = task.threadLinks.length > 0;
  const dueDateInfo = getDueDateInfo(task.dueDate);
  const isAssignee = user?.id === task.assignee?.id;

  // Only show Done/Decline for pending links where I'm the recipient, and only in actionRequired section
  const assigneeId = task.assignee?.id;
  const pendingLink =
    section === 'actionRequired' && assigneeId && user?.id
      ? task.threadLinks.find(
          (l) =>
            l.status === 'PENDING' &&
            l.toUser?.id === assigneeId &&
            assigneeId === user.id &&
            l.type !== 'BLOCKER'
        )
      : undefined;

  // Find pending blocker links that I created (I can self-resolve) — show in both actionRequired and waiting
  const pendingBlocker =
    (section === 'actionRequired' || section === 'waiting') && user?.id
      ? task.threadLinks.find(
          (l) =>
            l.status === 'PENDING' &&
            l.type === 'BLOCKER' &&
            l.fromUser.id === user.id
        )
      : undefined;

  // Show Done button for self-assigned tasks (no pending thread link or blocker)
  const canComplete =
    section === 'actionRequired' &&
    isAssignee &&
    !pendingLink &&
    !pendingBlocker &&
    task.status !== 'COMPLETED';

  // Pull thread logic: in waiting section, find a PENDING link where I'm the fromUser
  const pullableLink =
    section === 'waiting' && user?.id
      ? task.threadLinks.find(
          (l) =>
            l.status === 'PENDING' &&
            l.fromUser.id === user.id &&
            l.type !== 'BLOCKER'
        )
      : undefined;
  // If no direct pullable link but task is forwarded down chain, use pullCurrentAssignee
  const canPullAssignee =
    section === 'waiting' &&
    user?.id &&
    !pullableLink &&
    task.creator.id === user.id &&
    task.assignee?.id !== user.id;

  const handlePull = async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      if (pullableLink) {
        await pullThread(pullableLink.id);
      } else if (canPullAssignee) {
        await pullCurrentAssignee(task.id);
      }
      toast.success(t('pullSuccess'));
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || t('pullCooldown'));
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border border-border bg-card p-3 hover:border-border/80 transition-colors',
        isSelected && 'bg-primary/5 border-primary/20',
        isDragging && 'shadow-lg'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Selection checkbox */}
        {(isSelecting || isSelected) && (
          <button
            className="shrink-0 flex items-center justify-center h-4 w-4 rounded border border-border hover:border-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(task.id);
            }}
          >
            {isSelected && <Check className="h-3 w-3 text-primary" />}
          </button>
        )}

        {/* Drag handle — always visible in custom sort mode */}
        {isDraggable && !isSelecting && (
          <button
            className="shrink-0 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-80 transition-opacity touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Status icon (display only) */}
        <span className="shrink-0">
          {statusIcons[task.status] || statusIcons.OPEN}
        </span>

        {/* Task group badge — hide when viewing that group */}
        {task.taskGroup && task.taskGroup.id !== currentGroupId && (
          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
            <Hash className="h-2.5 w-2.5" />
            {task.taskGroup.name}
          </span>
        )}

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onSelect?.(task.id)}
        >
          <div className="flex items-center gap-2">
            {priorityConfig[task.priority] && (
              <Tooltip>
                <TooltipTrigger render={<span className="shrink-0" />}>
                  <Flag
                    className={cn(
                      'h-3 w-3',
                      priorityConfig[task.priority].color
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t(task.priority.toLowerCase())}
                </TooltipContent>
              </Tooltip>
            )}
            <span
              className={cn(
                'text-sm font-medium',
                task.status === 'COMPLETED' &&
                  'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>
            {task.type === 'VOTE' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                <Vote className="h-2.5 w-2.5" />
                {t('voteTask')}
              </span>
            )}
            {hasThreads && (
              <Badge
                variant="outline"
                className="h-5 text-[10px] gap-1 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                <Link2 className="h-3 w-3" />
                {task.threadLinks.length}
              </Badge>
            )}
            {(task._count?.files ?? 0) > 0 && (
              <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>

          {/* Waiting section: show current worker inline */}
          {section === 'waiting' && task.assignee && (
            <div className="flex items-center gap-1 mt-1">
              <User className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] text-blue-400">
                {task.assignee.name}
              </span>
            </div>
          )}

          {/* Blocker indicator */}
          {pendingBlocker && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1 mt-1 cursor-default" />
                }
              >
                <ShieldAlert className="h-3 w-3 text-red-400" />
                <span className="text-[10px] text-red-400 truncate max-w-[500px]">
                  {pendingBlocker.blockerNote}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs whitespace-pre-wrap">
                {pendingBlocker.blockerNote}
              </TooltipContent>
            </Tooltip>
          )}

          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {task.description}
            </p>
          )}
          {dueDateInfo && (
            <div
              className={cn(
                'flex items-center gap-1 mt-0.5',
                dueDateInfo.color
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              <span className="text-[10px]">{dueDateInfo.text}</span>
            </div>
          )}
        </div>

        {/* Chat indicator */}
        {(task._count?.chatMessages ?? 0) > 0 && (
          <span className="relative inline-flex shrink-0">
            <MessageCircle className="h-3 w-3 text-muted-foreground" />
            {(task.unreadChatCount ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-medium text-white">
                {task.unreadChatCount}
              </span>
            )}
          </span>
        )}

        {/* Assignee avatar — hidden on mobile */}
        {!isMobile && task.assignee && (
          <UserProfilePopover userId={task.assignee.id}>
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[9px] bg-secondary">
                {task.assignee.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </UserProfilePopover>
        )}

        {/* Actions — desktop: inline with labels */}
        {!isMobile && (
          <div className="relative flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            {canComplete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-green-500 hover:text-green-400"
                onClick={() => updateTask(task.id, { status: 'COMPLETED' })}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {tc('done')}
              </Button>
            )}
            {pendingBlocker && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-orange-500 hover:text-orange-400"
                      disabled={isResolving}
                      onClick={async () => {
                        setIsResolving(true);
                        try {
                          await resolveBlocker(pendingBlocker.id);
                        } catch {
                          setIsResolving(false);
                        }
                      }}
                    />
                  }
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {isResolving ? t('resolving') : t('resolveBlocker')}
                </TooltipTrigger>
                <TooltipContent>{pendingBlocker.blockerNote}</TooltipContent>
              </Tooltip>
            )}
            {pendingLink && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-green-500 hover:text-green-400"
                  disabled={isResolving}
                  onClick={() => handleResolve(pendingLink.id)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {isResolving ? t('resolving') : tc('done')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-red-500 hover:text-red-400"
                  disabled={isDeclining}
                  onClick={() => setShowDecline(true)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t('decline')}
                </Button>
              </>
            )}
            {(pullableLink || canPullAssignee) && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-amber-500 hover:text-amber-400"
                      disabled={isPulling}
                      onClick={handlePull}
                    />
                  }
                >
                  <ArrowDownFromLine className="h-3.5 w-3.5 mr-1" />
                  {isPulling ? '...' : t('pullThread')}
                </TooltipTrigger>
                <TooltipContent>{t('pullTooltip')}</TooltipContent>
              </Tooltip>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onSelect?.(task.id, true)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            {section === 'actionRequired' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setShowConnect(true)}
                data-onboarding="connect-thread"
              >
                <Link2 className="h-3.5 w-3.5 mr-1" />
                {t('connect')}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onToggleSelect && (
                  <DropdownMenuItem onClick={() => onToggleSelect(task.id)}>
                    <Check className="mr-2 h-4 w-4" />
                    {tc('select')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setShowReminderInput(true);
                  }}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  {t('setReminder')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tc('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {showReminderInput && (
              <Dialog open onOpenChange={() => { setShowReminderInput(false); setReminderDate(''); setReminderTime(''); }}>
                <DialogContent className="sm:max-w-sm p-0">
                  <DialogHeader className="px-4 pt-4 pb-0">
                    <DialogTitle>{t('setReminder')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 px-4 pb-4">
                    <Calendar
                      mode="single"
                      selected={reminderDate ? new Date(reminderDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setReminderDate(`${y}-${m}-${d}`);
                        } else {
                          setReminderDate('');
                        }
                      }}
                      disabled={{ before: new Date() }}
                      className="rounded-md border border-border mx-auto"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">{tc('time') || 'Time'}</label>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowReminderInput(false); setReminderDate(''); setReminderTime(''); }}>
                        {tc('cancel')}
                      </Button>
                      <Button size="sm" className="flex-1" disabled={!reminderDate || !reminderTime} onClick={async () => {
                        if (!reminderDate || !reminderTime) return;
                        try {
                          const { api } = await import('@/lib/api-client');
                          await api.post(`/tasks/${task.id}/reminder`, {
                            remindAt: new Date(`${reminderDate}T${reminderTime}`).toISOString(),
                          });
                          setShowReminderInput(false);
                          setReminderDate('');
                          setReminderTime('');
                          toast.success(t('reminderSet'));
                        } catch {
                          toast.error(t('reminderExists') || 'Failed');
                        }
                      }}>
                        {tc('save')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>

      {/* Actions — mobile: icon-only compact bar below title */}
      {isMobile && (
        <div className="relative flex items-center gap-0.5 mt-1.5 ml-7">
          {canComplete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-green-500 hover:text-green-400"
              onClick={() => updateTask(task.id, { status: 'COMPLETED' })}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {pendingBlocker && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-orange-500 hover:text-orange-400"
              disabled={isResolving}
              onClick={async () => {
                setIsResolving(true);
                try {
                  await resolveBlocker(pendingBlocker.id);
                } catch {
                  setIsResolving(false);
                }
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {pendingLink && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-green-500 hover:text-green-400"
              disabled={isResolving}
              onClick={() => handleResolve(pendingLink.id)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {(pullableLink || canPullAssignee) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-amber-500 hover:text-amber-400"
              disabled={isPulling}
              onClick={handlePull}
            >
              <ArrowDownFromLine className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onSelect?.(task.id, true)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          {section === 'actionRequired' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => setShowConnect(true)}
              data-onboarding="connect-thread"
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                />
              }
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onToggleSelect && (
                <DropdownMenuItem onClick={() => onToggleSelect(task.id)}>
                  <Check className="mr-2 h-4 w-4" />
                  {tc('select')}
                </DropdownMenuItem>
              )}
              {pendingLink && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDecline(true)}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('decline')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setShowReminderInput(true);
                }}
              >
                <Bell className="mr-2 h-4 w-4" />
                {t('setReminder')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tc('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {showReminderInput && (
            <Dialog open onOpenChange={() => { setShowReminderInput(false); setReminderDate(''); setReminderTime(''); }}>
              <DialogContent className="sm:max-w-sm p-0">
                <DialogHeader className="px-4 pt-4 pb-0">
                  <DialogTitle>{t('setReminder')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 px-4 pb-4">
                  <Calendar
                    mode="single"
                    selected={reminderDate ? new Date(reminderDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setReminderDate(`${y}-${m}-${d}`);
                      } else {
                        setReminderDate('');
                      }
                    }}
                    disabled={{ before: new Date() }}
                    className="rounded-md border border-border mx-auto"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">{tc('time') || 'Time'}</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowReminderInput(false); setReminderDate(''); setReminderTime(''); }}>
                      {tc('cancel')}
                    </Button>
                    <Button size="sm" className="flex-1" disabled={!reminderDate || !reminderTime} onClick={async () => {
                      if (!reminderDate || !reminderTime) return;
                      try {
                        const { api } = await import('@/lib/api-client');
                        await api.post(`/tasks/${task.id}/reminder`, {
                          remindAt: new Date(`${reminderDate}T${reminderTime}`).toISOString(),
                        });
                        setShowReminderInput(false);
                        setReminderDate('');
                        setReminderTime('');
                        toast.success(t('reminderSet'));
                      } catch {
                        toast.error(t('reminderExists') || 'Failed');
                      }
                    }}>
                      {tc('save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Thread chain visualization */}
      {expanded && hasThreads && (
        <div className="mt-3 ml-7">
          <ThreadChain links={task.threadLinks} creator={task.creator} />
        </div>
      )}

      {/* Connect dialog */}
      {showConnect && (
        <ConnectDialog taskId={task.id} onClose={() => setShowConnect(false)} />
      )}

      {/* Decline confirmation dialog */}
      {showDecline && pendingLink && (
        <Dialog
          open
          onOpenChange={() => {
            setShowDecline(false);
            setDeclineReason('');
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('declineTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('declineDescription')}
              </p>
              <Textarea
                placeholder={t('declineReasonPlaceholder')}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDecline(false);
                    setDeclineReason('');
                  }}
                >
                  {tc('cancel')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isDeclining}
                  onClick={() => handleDecline(pendingLink.id)}
                >
                  {isDeclining ? t('declining') : t('decline')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
