'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { TeamMemberStats } from './team-member-stats';
import { TeamTaskList } from './team-task-list';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, Clock, ListTodo } from 'lucide-react';

interface MemberStat {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: string;
  activeTodos: number;
  pendingThreads: number;
  completedTodos: number;
}

interface Dashboard {
  id: string;
  name: string;
  memberCount: number;
  todoCount: number;
  members: MemberStat[];
  totals: {
    activeTodos: number;
    pendingThreads: number;
    completedThisWeek: number;
  };
}

interface TeamTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: { id: string; name: string; avatarUrl?: string };
  creator: { id: string; name: string; avatarUrl?: string };
  createdAt: string;
}

interface TeamDashboardProps {
  teamId: string;
  workspaceId: string;
}

export function TeamDashboard({ teamId, workspaceId }: TeamDashboardProps) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, tasksRes] = await Promise.all([
          api.get(`/workspaces/${workspaceId}/teams/${teamId}/dashboard`),
          api.get(`/workspaces/${workspaceId}/teams/${teamId}/tasks`),
        ]);
        setDashboard(dashRes.data);
        setTasks(tasksRes.data);
      } catch (error) {
        console.error('Failed to load team data:', error);
      } finally {
        setIsLoading(false);
        setTasksLoading(false);
      }
    };

    fetchData();
  }, [teamId, workspaceId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Failed to load dashboard
      </div>
    );
  }

  const maxActive = Math.max(
    ...dashboard.members.map((m) => m.activeTodos),
    1,
  );

  return (
    <div className="space-y-4 p-3">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ListTodo className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Active</span>
          </div>
          <p className="text-xl font-bold">{dashboard.totals.activeTodos}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-xl font-bold">{dashboard.totals.pendingThreads}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Done/wk</span>
          </div>
          <p className="text-xl font-bold text-green-500">
            {dashboard.totals.completedThisWeek}
          </p>
        </div>
      </div>

      {/* Member workload */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Member Workload
          </h3>
        </div>
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {dashboard.members.map((member) => (
            <TeamMemberStats
              key={member.userId}
              member={member}
              maxActive={maxActive}
            />
          ))}
        </div>
      </div>

      {/* Team tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Team Tasks
            </h3>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {tasks.length}
          </Badge>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <TeamTaskList tasks={tasks} isLoading={tasksLoading} />
        </div>
      </div>
    </div>
  );
}
