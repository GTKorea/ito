'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { TodoList } from '@/components/todos/todo-list';
import { CreateTodo } from '@/components/todos/create-todo';
import { TodoDetail } from '@/components/todos/todo-detail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Building2 } from 'lucide-react';
import { QuickInput } from '@/components/todos/quick-input';

function CreateWorkspacePrompt() {
  const { createWorkspace } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const t = useTranslations('workspace');
  const tc = useTranslations('common');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await createWorkspace(name, slug);
    setOpen(false);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
        <Building2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{t('noWorkspaceYet')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('createWorkspaceToStart')}
        </p>
      </div>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        {t('createWorkspace')}
      </Button>

      {open && (
        <Dialog open onOpenChange={() => setOpen(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('createWorkspace')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t('workspaceName')}</Label>
                <Input
                  placeholder={t('workspaceNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!name.trim()}>
                {tc('create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const { currentWorkspace, isLoading: wsLoading } = useWorkspaceStore();
  const { todos, isLoading, fetchTodos } = useTodoStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const t = useTranslations('workspace');

  useEffect(() => {
    if (currentWorkspace) fetchTodos(currentWorkspace.id);
  }, [currentWorkspace, fetchTodos]);

  if (wsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return <CreateWorkspacePrompt />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('myTasks')}</h1>
          <p className="text-xs text-muted-foreground">
            {t('tasksAssignedToYou')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('newTask')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-2">
        {showCreate && (
          <CreateTodo
            workspaceId={currentWorkspace.id}
            onClose={() => setShowCreate(false)}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <TodoList todos={todos} onSelectTodo={setSelectedTodoId} />
        )}
      </div>

      {/* Quick Input */}
      <QuickInput />

      {/* Todo Detail Slide-over */}
      {selectedTodoId && (
        <TodoDetail
          todoId={selectedTodoId}
          onClose={() => setSelectedTodoId(null)}
        />
      )}
    </div>
  );
}
