'use client';

import { useState, useEffect } from 'react';
import { useTodoStore } from '@/stores/todo-store';
import { api } from '@/lib/api-client';
import { ThreadChain } from '@/components/threads/thread-chain';
import { FileUpload } from '@/components/files/file-upload';
import { FileList } from '@/components/files/file-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Save, Link2, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

const statuses = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
const priorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

interface TodoDetailProps {
  todoId: string;
  onClose: () => void;
}

export function TodoDetail({ todoId, onClose }: TodoDetailProps) {
  const { updateTodo } = useTodoStore();
  const [todo, setTodo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    api
      .get(`/todos/${todoId}`)
      .then(({ data }) => {
        setTodo(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setStatus(data.status);
        setPriority(data.priority);
        setDueDate(data.dueDate ? data.dueDate.slice(0, 10) : '');
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [todoId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTodo(todoId, {
        title,
        description: description || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
      });
      // Refetch to get updated data
      const { data } = await api.get(`/todos/${todoId}`);
      setTodo(data);
    } catch {
      // handle
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !todo) {
    return (
      <div className="fixed right-0 top-0 z-50 flex h-full w-[420px] items-center justify-center border-l border-border bg-[#1A1A1A]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col border-l border-border bg-[#1A1A1A] animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-[#ECECEC]">Task Detail</h2>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-base font-semibold bg-transparent border-none px-0 focus-visible:ring-0"
          placeholder="Title"
        />

        {/* Description */}
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-transparent border-border min-h-[80px] text-sm"
          placeholder="Add a description..."
          rows={3}
        />

        {/* Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              Status
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
              Priority
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
              Due Date
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
              Assignee
            </label>
            <div className="flex items-center gap-2 h-8">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-secondary">
                  {todo.assignee?.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-foreground truncate">
                {todo.assignee?.name || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="mr-1 h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>

        {/* Thread Chain */}
        {todo.threadLinks?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Thread Chain ({todo.threadLinks.length})
            </div>
            <ThreadChain links={todo.threadLinks} creator={todo.creator} />
          </div>
        )}

        {/* Files */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
          </div>
          <FileList todoId={todoId} refreshKey={fileRefreshKey} />
          <FileUpload
            todoId={todoId}
            onUploadComplete={() => setFileRefreshKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  );
}
