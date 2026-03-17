'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ThreadLink {
  id: string;
  fromUser: User;
  toUser: User;
  message?: string;
  status: string;
  chainIndex: number;
}

interface ThreadChainProps {
  links: ThreadLink[];
  creator: User;
}

const statusColor: Record<string, string> = {
  PENDING: 'border-yellow-500/50 bg-yellow-500/10',
  COMPLETED: 'border-green-500/50 bg-green-500/10',
  FORWARDED: 'border-blue-500/50 bg-blue-500/10',
  CANCELLED: 'border-red-500/50 bg-red-500/10',
};

const lineColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/40',
  COMPLETED: 'bg-green-500/40',
  FORWARDED: 'bg-blue-500/40',
  CANCELLED: 'bg-red-500/40',
};

export function ThreadChain({ links, creator }: ThreadChainProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {/* Creator node */}
      <ChainNode user={creator} label="Creator" />

      {links.map((link) => (
        <div key={link.id} className="flex items-center">
          {/* Thread line */}
          <div className="flex flex-col items-center mx-1">
            <div className={cn('h-0.5 w-8', lineColor[link.status] || 'bg-border')} />
            {link.message && (
              <span className="text-[9px] text-muted-foreground mt-0.5 max-w-16 truncate">
                {link.message}
              </span>
            )}
          </div>

          {/* Recipient node */}
          <ChainNode
            user={link.toUser}
            label={link.status.toLowerCase()}
            statusClass={statusColor[link.status]}
          />
        </div>
      ))}
    </div>
  );
}

function ChainNode({
  user,
  label,
  statusClass,
}: {
  user: User;
  label: string;
  statusClass?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('rounded-full border p-0.5', statusClass || 'border-border')}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] bg-secondary">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="text-[10px] text-muted-foreground max-w-14 truncate">
        {user.name}
      </span>
      <span className="text-[8px] text-muted-foreground/60">{label}</span>
    </div>
  );
}
