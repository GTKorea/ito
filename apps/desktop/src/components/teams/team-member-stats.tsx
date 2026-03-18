'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface MemberStat {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: string;
  activeTodos: number;
  pendingThreads: number;
  completedTodos: number;
}

interface TeamMemberStatsProps {
  member: MemberStat;
  maxActive: number;
}

export function TeamMemberStats({ member, maxActive }: TeamMemberStatsProps) {
  const barWidth = maxActive > 0 ? (member.activeTodos / maxActive) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/20 transition-colors">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px] bg-secondary">
          {member.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{member.name}</span>
          {member.role === 'LEAD' && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              Lead
            </Badge>
          )}
        </div>

        {/* Workload bar */}
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                barWidth > 75
                  ? 'bg-destructive'
                  : barWidth > 50
                    ? 'bg-yellow-500'
                    : 'bg-primary'
              }`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {member.activeTodos} active
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {member.pendingThreads}
          </p>
          <p>pending</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-green-500">
            {member.completedTodos}
          </p>
          <p>done</p>
        </div>
      </div>
    </div>
  );
}
