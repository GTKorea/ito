'use client';

import { useEffect, useState } from 'react';
import { useTodoStore } from '@/stores/todo-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { TodoList } from '@/components/todos/todo-list';
import { CreateTodo } from '@/components/todos/create-todo';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function WorkspacePage() {
  const { currentWorkspace, isLoading: wsLoading } = useWorkspaceStore();
  const { todos, isLoading, fetchTodos } = useTodoStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (currentWorkspace) fetchTodos(currentWorkspace.id);
  }, [currentWorkspace, fetchTodos]);

  if (wsLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading workspaces...
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No workspace selected
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">My Todos</h1>
          <p className="text-xs text-muted-foreground">
            Tasks assigned to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Todo
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
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
          <TodoList todos={todos} />
        )}
      </div>
    </div>
  );
}
