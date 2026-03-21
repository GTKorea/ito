'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSharedSpaceStore } from '@/stores/shared-space-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Globe,
  Users,
  Copy,
  Check,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SharedSpaceDetailProps {
  sharedSpaceId: string;
  onBack: () => void;
}

export function SharedSpaceDetail({ sharedSpaceId, onBack }: SharedSpaceDetailProps) {
  const {
    currentSharedSpace,
    tasks,
    tasksLoading,
    fetchSharedSpace,
    fetchTasks,
    createTask,
    inviteWorkspace,
    removeParticipant,
  } = useSharedSpaceStore();

  const t = useTranslations('sharedSpaces');
  const tc = useTranslations('common');

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [inviteSlug, setInviteSlug] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSharedSpace(sharedSpaceId);
    fetchTasks(sharedSpaceId);
  }, [sharedSpaceId, fetchSharedSpace, fetchTasks]);

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    await createTask(sharedSpaceId, newTitle, newDescription || undefined);
    setNewTitle('');
    setNewDescription('');
    setShowCreateTask(false);
  };

  const handleInvite = async () => {
    if (!inviteSlug.trim()) return;
    try {
      const result = await inviteWorkspace(sharedSpaceId, inviteSlug);
      setInviteLink(result.inviteLink);
      setInviteSlug('');
    } catch {
      // handle error
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-500/20 text-blue-400',
    IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
    BLOCKED: 'bg-red-500/20 text-red-400',
    COMPLETED: 'bg-green-500/20 text-green-400',
    CANCELLED: 'bg-zinc-500/20 text-zinc-400',
  };

  const priorityColors: Record<string, string> = {
    URGENT: 'text-red-400',
    HIGH: 'text-orange-400',
    MEDIUM: 'text-yellow-400',
    LOW: 'text-zinc-400',
  };

  if (!currentSharedSpace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold">{currentSharedSpace.name}</h1>
          </div>
          {currentSharedSpace.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentSharedSpace.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInvite(true)}
          >
            <UserPlus className="mr-1 h-4 w-4" />
            {t('inviteWorkspace')}
          </Button>
          <Button size="sm" onClick={() => setShowCreateTask(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('newTask')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Participating Workspaces */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {t('participatingWorkspaces')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {currentSharedSpace.participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 bg-card"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                    {p.workspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{p.workspace.name}</span>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0"
                >
                  {p.role}
                </Badge>
                {p.workspace._count && (
                  <span className="text-[10px] text-muted-foreground">
                    {p.workspace._count.members} {t('members')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="px-6 py-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {t('sharedTasks')} ({tasks.length})
          </h2>

          {tasksLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">{t('noTasksYet')}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setShowCreateTask(true)}
              >
                {t('createFirstTask')}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {task.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5 py-0',
                          statusColors[task.status],
                        )}
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[7px] bg-secondary">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-muted-foreground">
                        {task.assignee.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        &middot;
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {task.workspace.name}
                      </Badge>
                      {task.priority && (
                        <span
                          className={cn(
                            'text-[10px]',
                            priorityColors[task.priority],
                          )}
                        >
                          {task.priority}
                        </span>
                      )}
                      {task.threadLinks.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {task.threadLinks.length} {t('threads')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      {showCreateTask && (
        <Dialog open onOpenChange={() => setShowCreateTask(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('createTask')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t('taskTitle')}</Label>
                <Input
                  placeholder={t('taskTitlePlaceholder')}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('descriptionOptional')}</Label>
                <Input
                  placeholder={t('taskDescriptionPlaceholder')}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateTask}
                className="w-full"
                disabled={!newTitle.trim()}
              >
                {tc('create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Workspace Dialog */}
      {showInvite && (
        <Dialog open onOpenChange={() => { setShowInvite(false); setInviteLink(''); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('inviteWorkspace')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {!inviteLink ? (
                <>
                  <div className="space-y-1.5">
                    <Label>{t('workspaceSlug')}</Label>
                    <Input
                      placeholder={t('workspaceSlugPlaceholder')}
                      value={inviteSlug}
                      onChange={(e) => setInviteSlug(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                      autoFocus
                    />
                  </div>
                  <Button onClick={handleInvite} className="w-full" disabled={!inviteSlug.trim()}>
                    {t('sendInvite')}
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('inviteSent')}</p>
                  <div className="flex items-center gap-2">
                    <Input value={inviteLink} readOnly className="text-xs" />
                    <Button size="sm" variant="outline" onClick={handleCopyLink}>
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
