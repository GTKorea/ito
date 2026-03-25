'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/stores/task-store';
import type { Task } from '@/stores/task-store';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/error-utils';
import { statusColors, priorityColors } from '@/lib/task-constants';
import { ThreadChain } from '@/components/threads/thread-chain';
import { ThreadGraph } from '@/components/threads/thread-graph';
import { FileUpload } from '@/components/files/file-upload';
import { FileList } from '@/components/files/file-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Save, Link2, Paperclip, List, Network, MessageCircle, Vote, Bell, Trash2, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ChatPanel } from '@/components/chat/chat-panel';
import { VotePanel } from '@/components/tasks/vote-panel';
import { useAuthStore } from '@/stores/auth-store';

const statuses = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
const priorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

interface Reminder {
  id: string;
  remindAt: string;
  sent: boolean;
}

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  initialShowChat?: boolean;
}

export function TaskDetail({ taskId, onClose, initialShowChat }: TaskDetailProps) {
  const { updateTask } = useTaskStore();
  const { user } = useAuthStore();
  const { isMobile } = useMediaQuery();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [graphView, setGraphView] = useState(false);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);
  const [showChat, setShowChat] = useState(initialShowChat ?? false);
  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [showReminderPopover, setShowReminderPopover] = useState(false);
  const t = useTranslations('tasks');
  const tc = useTranslations('chat');

  useEffect(() => {
    if (initialShowChat) setShowChat(true);
  }, [initialShowChat]);

  useEffect(() => {
    setIsLoading(true);
    api
      .get(`/tasks/${taskId}`)
      .then(({ data }) => {
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setStatus(data.status);
        setPriority(data.priority);
        setDueDate(data.dueDate ? data.dueDate.slice(0, 10) : '');
      })
      .catch((e) => console.error('Failed to load task:', e))
      .finally(() => setIsLoading(false));
  }, [taskId]);

  // Fetch existing reminder for this task
  useEffect(() => {
    api.get(`/tasks/${taskId}/reminder`)
      .then(({ data }) => { if (data) setReminder(data); })
      .catch(() => {});
  }, [taskId]);

  const handleSetReminder = async () => {
    if (!reminderDate || !reminderTime) return;
    setReminderLoading(true);
    try {
      const remindAt = new Date(`${reminderDate}T${reminderTime}`).toISOString();
      const { data } = await api.post(`/tasks/${taskId}/reminder`, { remindAt });
      setReminder(data);
      setShowReminderPopover(false);
      toast.success(t('reminderSet'));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('saveFailed')));
    } finally {
      setReminderLoading(false);
    }
  };

  const handleDeleteReminder = async () => {
    try {
      await api.delete(`/tasks/${taskId}/reminder`);
      setReminder(null);
      setReminderDate('');
      setReminderTime('');
      toast.success(t('reminderDeleted'));
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTask(taskId, {
        title,
        description: description || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
      });
      toast.success(t('saved'));
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !task) {
    return (
      <div className="flex h-full w-full items-center justify-center border-l border-border bg-[#1A1A1A]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="flex h-full w-full flex-col bg-[#0F0F0F]">
        <div className="flex-1 min-h-0">
          <ChatPanel taskId={taskId} onClose={() => setShowChat(false)} />
        </div>
        {isMobile && (
          <div className="flex justify-center py-3 border-t border-border shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 rounded-full bg-accent/50"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-[#1A1A1A]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-[#ECECEC]">{t('taskDetail')}</h2>
        <div className="flex items-center gap-1">
          <Popover open={showReminderPopover} onOpenChange={setShowReminderPopover}>
            <PopoverTrigger render={
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', reminder && !reminder.sent && 'text-amber-500')}
                title={t('setReminder')}
              />
            }>
              <Bell className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 space-y-3" align="end">
              {reminder && !reminder.sent ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t('reminderExists')}</p>
                  <p className="text-xs font-medium">
                    {new Date(reminder.remindAt).toLocaleString()}
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full h-7 text-xs"
                    onClick={handleDeleteReminder}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t('deleteReminder')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t('selectDateTime')}</p>
                  <Input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    disabled={!reminderDate || !reminderTime || reminderLoading}
                    onClick={handleSetReminder}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    {t('setReminder')}
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowChat(true)}
            title={tc('title')}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border px-4">
        {(['details', 'files'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === tab
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Details tab */}
        {activeTab === 'details' && (
          <>
            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-semibold bg-transparent border-none px-2 focus-visible:ring-0"
              placeholder={t('title')}
            />

            {/* Description */}
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-transparent border-border min-h-[80px] text-sm"
              placeholder={t('addDescription')}
              rows={3}
            />

            {/* Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  {t('status')}
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs flex items-center justify-between">
                        <span className={statusColors[status] || 'text-foreground'}>
                          {status.replace('_', ' ')}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    }
                  />
                  <DropdownMenuContent>
                    {statuses.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => setStatus(s)}>
                        <span className={cn('flex items-center gap-2 text-xs', statusColors[s] || 'text-foreground')}>
                          {status === s && <Check className="h-3 w-3" />}
                          {status !== s && <span className="w-3" />}
                          {s.replace('_', ' ')}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  {t('priority')}
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs flex items-center justify-between">
                        <span className={priorityColors[priority] || 'text-foreground'}>
                          {priority}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    }
                  />
                  <DropdownMenuContent>
                    {priorities.map((p) => (
                      <DropdownMenuItem key={p} onClick={() => setPriority(p)}>
                        <span className={cn('flex items-center gap-2 text-xs', priorityColors[p] || 'text-foreground')}>
                          {priority === p && <Check className="h-3 w-3" />}
                          {priority !== p && <span className="w-3" />}
                          {p}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  {t('dueDate')}
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  {t('assignee')}
                </label>
                <div className="flex items-center gap-2 h-8">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-secondary">
                      {task.assignee?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground truncate">
                    {task.assignee?.name || t('unassigned')}
                  </span>
                </div>
              </div>
            </div>

            {/* Save button */}
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="mr-1 h-3.5 w-3.5" />
              {isSaving ? t('saving') : t('saveChanges')}
            </Button>

            {/* Vote Panel */}
            {task.type === 'VOTE' && task.voteConfig && (
              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Vote className="h-3.5 w-3.5" />
                  {t('voteTask')}
                </h3>
                <VotePanel
                  taskId={task.id}
                  voteConfig={task.voteConfig}
                  isCreator={task.creator?.id === user?.id}
                />
              </div>
            )}

            {/* Thread section */}
            {task.threadLinks?.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-4 w-4" />
                    {t('threadChain')} ({task.threadLinks.length})
                  </div>
                  {task.threadLinks.length >= 2 && (
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => setGraphView(false)}
                        className={cn(
                          'rounded p-1 transition-colors',
                          !graphView ? 'bg-accent text-foreground' : 'hover:bg-accent/50',
                        )}
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setGraphView(true)}
                        className={cn(
                          'rounded p-1 transition-colors',
                          graphView ? 'bg-accent text-foreground' : 'hover:bg-accent/50',
                        )}
                      >
                        <Network className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {graphView ? (
                  <div className="h-64 rounded-lg border border-border overflow-hidden">
                    <ThreadGraph links={task.threadLinks} creator={task.creator} />
                  </div>
                ) : (
                  <ThreadChain links={task.threadLinks} creator={task.creator} />
                )}
              </div>
            )}
          </>
        )}

        {/* Files tab */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" />
              {t('attachments')}
            </h3>
            <FileList taskId={taskId} refreshKey={fileRefreshKey} />
            <FileUpload
              taskId={taskId}
              onUploadComplete={() => setFileRefreshKey((k) => k + 1)}
            />
          </div>
        )}
      </div>

      {/* Mobile: thumb-friendly close button at the bottom */}
      {isMobile && (
        <div className="flex justify-center py-3 border-t border-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full bg-accent/50"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
