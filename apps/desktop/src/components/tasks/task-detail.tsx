'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/stores/task-store';
import { api } from '@/lib/api-client';
import { ThreadChain } from '@/components/threads/thread-chain';
import { ThreadGraph } from '@/components/threads/thread-graph';
import { FileUpload } from '@/components/files/file-upload';
import { FileList } from '@/components/files/file-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Save, Link2, Paperclip, List, Network, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatPanel } from '@/components/chat/chat-panel';

const statuses = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
const priorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  initialShowChat?: boolean;
}

export function TaskDetail({ taskId, onClose, initialShowChat }: TaskDetailProps) {
  const { updateTask } = useTaskStore();
  const [task, setTask] = useState<any>(null);
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
      // Refetch to get updated data
      const { data } = await api.get(`/tasks/${taskId}`);
      setTask(data);
    } catch (error) {
      console.error('Failed to update task:', error);
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
      <div className="flex h-full w-full bg-[#0F0F0F]">
        <ChatPanel taskId={taskId} onClose={() => setShowChat(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-[#1A1A1A]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-[#ECECEC]">{t('taskDetail')}</h2>
        <div className="flex items-center gap-1">
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
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
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              {t('status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              {t('priority')}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              {t('dueDate')}
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
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

        {/* Thread Chain */}
        {task.threadLinks?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
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

        {/* Files */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" />
            {t('attachments')}
          </div>
          <FileList taskId={taskId} refreshKey={fileRefreshKey} />
          <FileUpload
            taskId={taskId}
            onUploadComplete={() => setFileRefreshKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  );
}
