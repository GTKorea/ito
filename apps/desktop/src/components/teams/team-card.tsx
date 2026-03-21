'use client';

import { Users, ListTodo, ChevronRight } from 'lucide-react';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    _count?: { members: number; tasks: number };
  };
  isExpanded: boolean;
  onClick: () => void;
}

export function TeamCard({ team, isExpanded, onClick }: TeamCardProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onClick}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{team.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {team._count?.members || 0}
          </span>
          <span className="flex items-center gap-1">
            <ListTodo className="h-3 w-3" />
            {team._count?.tasks || 0} tasks
          </span>
        </div>
      </div>
      <ChevronRight
        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
          isExpanded ? 'rotate-90' : ''
        }`}
      />
    </div>
  );
}
