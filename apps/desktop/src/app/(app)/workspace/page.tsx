'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

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
import { Plus, Building2, ArrowUpDown } from 'lucide-react';
import { QuickInput } from '@/components/todos/quick-input';
import { cn } from '@/lib/utils';

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
  const { todos, connectedTodos, isLoading, fetchTodos, fetchConnectedTodos } = useTodoStore();
  const { checkAndStartWizard } = useOnboardingStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [openWithChat, setOpenWithChat] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');
  const searchParams = useSearchParams();
  const t = useTranslations('workspace');
  const tt = useTranslations('todos');

  useEffect(() => {
    if (currentWorkspace) {
      fetchTodos(currentWorkspace.id);
      fetchConnectedTodos(currentWorkspace.id);
    }
  }, [currentWorkspace, fetchTodos, fetchConnectedTodos]);

  // Trigger onboarding wizard on first workspace visit
  useEffect(() => {
    if (currentWorkspace) {
      checkAndStartWizard();
    }
  }, [currentWorkspace, checkAndStartWizard]);

  // Auto-select todo from query param (e.g. from notification click)
  useEffect(() => {
    const todoId = searchParams.get('todo');
    if (todoId) {
      setSelectedTodoId(todoId);
    }
  }, [searchParams]);

  const handleSelectTodo = (id: string, openChat?: boolean) => {
    setSelectedTodoId(id);
    setDrawerVisible(true);
    setOpenWithChat(!!openChat);
  };

  const handleCloseTodo = () => {
    setDrawerVisible(false);
    setOpenWithChat(false);
    // Wait for slide-out animation to finish before unmounting
    setTimeout(() => setSelectedTodoId(null), 200);
  };

  const sortedTodos = useMemo(() => {
    if (sortBy === 'dueDate') {
      return [...todos].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return todos;
  }, [todos, sortBy]);

  const sortedConnectedTodos = useMemo(() => {
    if (sortBy === 'dueDate') {
      return [...connectedTodos].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return connectedTodos;
  }, [connectedTodos, sortBy]);

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
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">{t('myTasks')}</h1>
          <p className="text-xs text-muted-foreground">
            {t('tasksAssignedToYou')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setSortBy(sortBy === 'priority' ? 'dueDate' : 'priority')}
          >
            <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
            {sortBy === 'priority' ? tt('sortByPriority') : tt('sortByDueDate')}
          </Button>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
          <Button size="sm" onClick={() => setShowCreate(true)} data-onboarding="new-task">
            <Plus className="mr-1 h-4 w-4" />
            {t('newTask')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-2">
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
          <TodoList todos={sortedTodos} connectedTodos={sortedConnectedTodos} onSelectTodo={handleSelectTodo} />
        )}
      </div>

      {/* Quick Input */}
      <QuickInput />

      {/* Backdrop */}
      {selectedTodoId && (
        <div
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200',
            drawerVisible ? 'bg-black/30 opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onClick={handleCloseTodo}
        />
      )}

      {/* Todo Detail Slide-over */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full md:w-[420px] transition-transform duration-200 ease-out',
          drawerVisible ? 'translate-x-0' : 'translate-x-full',
          !selectedTodoId && 'pointer-events-none',
        )}
      >
        {selectedTodoId && (
          <TodoDetail
            todoId={selectedTodoId}
            onClose={handleCloseTodo}
            initialShowChat={openWithChat}
          />
        )}
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard />


    </div>
  );
}
