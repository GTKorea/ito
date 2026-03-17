'use client';

import { useState } from 'react';
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
  const { createTodo } = useTodoStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTodo(workspaceId, title, description || undefined);
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <Input
        placeholder="Todo title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim()}>
          Create
        </Button>
      </div>
    </form>
  );
}
