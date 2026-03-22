'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/stores/task-store';
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
  Calendar,
  X,
  MessageCircle,
  User,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Status names are now translated via useTranslations

const statusIcons: Record<string, React.ReactNode> = {
  OPEN: <Circle className="h-4 w-4 text-muted-foreground" />,
  IN_PROGRESS: <CircleDot className="h-4 w-4 text-blue-500" />,
  BLOCKED: <Ban className="h-4 w-4 text-yellow-500" />,
  COMPLETED: <Check className="h-4 w-4 text-green-500" />,
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
    creator: { id: string; name: string; avatarUrl?: string };
    assignee?: { id: string; name: string; avatarUrl?: string };
    threadLinks: Array<{
      id: string;
      fromUser: { id: string; name: string; avatarUrl?: string };
      toUser: { id: string; name: string; avatarUrl?: string };
      message?: string;
      status: string;
      chainIndex: number;
      groupId?: string;
    }>;
  };
  onSelect?: (id: string, openChat?: boolean) => void;
  section: TaskSection;
}

export function TaskItem({ task, onSelect, section }: TaskItemProps) {
  const [showConnect, setShowConnect] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const { updateTask, deleteTask, resolveThread, declineThread } = useTaskStore();
  const { user } = useAuthStore();
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
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: t('overdue'), color: 'text-red-500' };
    if (diff === 0) return { text: t('dueToday'), color: 'text-yellow-500' };
    if (diff === 1) return { text: t('dueTomorrow'), color: 'text-yellow-500' };
    return {
      text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-muted-foreground',
    };
  }

  const hasThreads = task.threadLinks.length > 0;
  const dueDateInfo = getDueDateInfo(task.dueDate);
  const isAssignee = user?.id === task.assignee?.id;

  // Only show Done/Decline for pending links where I'm the recipient, and only in actionRequired section
  const assigneeId = task.assignee?.id;
  const pendingLink = section === 'actionRequired' && assigneeId && user?.id
    ? task.threadLinks.find(
        (l) => l.status === 'PENDING' && l.toUser.id === assigneeId && assigneeId === user.id,
      )
    : undefined;

  // Show Done button for self-assigned tasks (no pending thread link)
  const canComplete = section === 'actionRequired' && isAssignee && !pendingLink && task.status !== 'COMPLETED';

  return (
    <div className="group rounded-lg border border-border bg-card p-3 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-3">
        {/* Status icon (display only) */}
        <Tooltip>
          <TooltipTrigger
            render={<span className="shrink-0" />}
          >
            {statusIcons[task.status] || statusIcons.OPEN}
          </TooltipTrigger>
          <TooltipContent side="left">{statusNames[task.status] || 'Open'}</TooltipContent>
        </Tooltip>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect?.(task.id)}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                task.status === 'COMPLETED' && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </span>
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

          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {task.description}
            </p>
          )}
          {dueDateInfo && (
            <div className={cn('flex items-center gap-1 mt-0.5', dueDateInfo.color)}>
              <Calendar className="h-3 w-3" />
              <span className="text-[10px]">{dueDateInfo.text}</span>
            </div>
          )}
        </div>

        {/* Assignee avatar */}
        {task.assignee && (
          <UserProfilePopover userId={task.assignee.id}>
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[9px] bg-secondary">
                {task.assignee.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </UserProfilePopover>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => onSelect?.(task.id, true)}
                />
              }
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>{t('chat')}</TooltipContent>
          </Tooltip>
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
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent>{t('moreActions')}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tc('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Thread chain visualization */}
      {expanded && hasThreads && (
        <div className="mt-3 ml-7">
          <ThreadChain links={task.threadLinks} creator={task.creator} />
        </div>
      )}

      {/* Connect dialog */}
      {showConnect && (
        <ConnectDialog
          taskId={task.id}
          onClose={() => setShowConnect(false)}
        />
      )}

      {/* Decline confirmation dialog */}
      {showDecline && pendingLink && (
        <Dialog open onOpenChange={() => { setShowDecline(false); setDeclineReason(''); }}>
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
                  onClick={() => { setShowDecline(false); setDeclineReason(''); }}
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
