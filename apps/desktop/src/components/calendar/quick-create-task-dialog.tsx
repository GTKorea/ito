'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTaskStore } from '@/stores/task-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuickCreateTaskDialogProps {
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function QuickCreateTaskDialog({
  date,
  open,
  onOpenChange,
  onCreated,
}: QuickCreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createTask } = useTaskStore();
  const { currentWorkspace } = useWorkspaceStore();
  const t = useTranslations('calendar');

  const handleCreate = async () => {
    if (!title.trim() || !currentWorkspace) return;
    setIsCreating(true);
    try {
      await createTask(currentWorkspace.id, title, undefined, undefined, date.toISOString().slice(0, 10));
      setTitle('');
      onOpenChange(false);
      onCreated?.();
    } finally {
      setIsCreating(false);
    }
  };

  const dateStr = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('createTask')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('title') || 'Title'}</Label>
            <Input
              placeholder={t('taskTitlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('dueDate')}</Label>
            <div className="text-sm text-muted-foreground bg-accent/30 rounded-md px-3 py-1.5">
              {dateStr}
            </div>
          </div>
          <Button
            onClick={handleCreate}
            className="w-full"
            disabled={!title.trim() || isCreating}
          >
            {isCreating ? t('creating') : t('create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
