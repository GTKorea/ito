'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';
import { TaskGraphView } from '@/components/graph/task-graph-view';


export default function GraphPage() {
  const { currentWorkspace, isLoading } = useWorkspaceStore();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Select a workspace to view the task graph.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TaskGraphView workspaceId={currentWorkspace.id} />


    </div>
  );
}
