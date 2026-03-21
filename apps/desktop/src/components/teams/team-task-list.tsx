'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ListTodo } from 'lucide-react';

interface TaskUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface TeamTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: TaskUser;
  creator: TaskUser;
  createdAt: string;
}

interface TeamTaskListProps {
  tasks: TeamTask[];
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500/20 text-blue-400',
  IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
  BLOCKED: 'bg-destructive/20 text-destructive',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const priorityLabels: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Med',
  LOW: 'Low',
};

export function TeamTaskList({ tasks, isLoading }: TeamTaskListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-muted-foreground">
        <ListTodo className="h-6 w-6 mb-2 opacity-40" />
        <p className="text-xs">No team tasks yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/20 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="secondary"
                className={`text-[9px] px-1.5 py-0 ${statusColors[task.status] || ''}`}
              >
                {task.status.replace('_', ' ')}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {priorityLabels[task.priority] || task.priority}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-secondary">
                {task.assignee.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
              {task.assignee.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
