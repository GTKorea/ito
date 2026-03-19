'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTodoStore } from '@/stores/todo-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CreateTodoProps {
  workspaceId: string;
  onClose: () => void;
}

export function CreateTodo({ workspaceId, onClose }: CreateTodoProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const { createTodo } = useTodoStore();
  const t = useTranslations('todos');
  const tc = useTranslations('common');

  const priorities = [
    { value: 'URGENT', label: t('urgent'), color: 'text-red-500' },
    { value: 'HIGH', label: t('high'), color: 'text-orange-500' },
    { value: 'MEDIUM', label: t('medium'), color: 'text-yellow-500' },
    { value: 'LOW', label: t('low'), color: 'text-blue-500' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTodo(
      workspaceId,
      title,
      description || undefined,
      priority,
      dueDate || undefined,
    );
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <Input
        placeholder={t('taskTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <Textarea
        placeholder={t('descriptionOptional')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div className="flex gap-3">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-auto"
          placeholder={t('dueDate')}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {tc('cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim()}>
          {tc('create')}
        </Button>
      </div>
    </form>
  );
}
