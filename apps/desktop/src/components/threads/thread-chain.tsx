'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
  groupId?: string;
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

const statusDot: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  COMPLETED: 'bg-green-500',
  FORWARDED: 'bg-blue-500',
  CANCELLED: 'bg-red-500',
};

interface ChainSegment {
  type: 'single';
  link: ThreadLink;
}

interface ParallelSegment {
  type: 'parallel';
  groupId: string;
  links: ThreadLink[];
  fromUser: User;
}

type Segment = ChainSegment | ParallelSegment;

export function ThreadChain({ links, creator }: ThreadChainProps) {
  const t = useTranslations('threads');

  // Build segments: group consecutive links with same groupId as parallel
  const segments = useMemo(() => {
    const result: Segment[] = [];
    const processed = new Set<string>();

    for (const link of links) {
      if (processed.has(link.id)) continue;

      if (link.groupId) {
        // Find all links with the same groupId
        const groupLinks = links.filter((l) => l.groupId === link.groupId);
        groupLinks.forEach((l) => processed.add(l.id));
        result.push({
          type: 'parallel',
          groupId: link.groupId,
          links: groupLinks,
          fromUser: link.fromUser,
        });
      } else {
        processed.add(link.id);
        result.push({ type: 'single', link });
      }
    }

    return result;
  }, [links]);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {/* Creator node */}
      <ChainNode user={creator} label={t('creator')} />

      {segments.map((segment, i) => {
        if (segment.type === 'single') {
          return (
            <div key={segment.link.id} className="flex items-center">
              <ChainLine status={segment.link.status} message={segment.link.message} />
              <ChainNode
                user={segment.link.toUser}
                label={segment.link.status.toLowerCase()}
                statusClass={statusColor[segment.link.status]}
              />
            </div>
          );
        }

        // Parallel segment
        return (
          <ParallelBranch key={segment.groupId} segment={segment} />
        );
      })}
    </div>
  );
}

function ParallelBranch({ segment }: { segment: ParallelSegment }) {
  const t = useTranslations('threads');
  const completedCount = segment.links.filter((l) => l.status === 'COMPLETED').length;
  const total = segment.links.length;

  return (
    <div className="flex items-center">
      {/* Branching connector from sender */}
      <div className="flex flex-col items-center mx-1">
        <div className="h-0.5 w-4 bg-blue-500/40" />
      </div>

      {/* Parallel branches */}
      <div className="flex flex-col gap-1.5 relative">
        {/* Vertical line on the left connecting branches */}
        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-border/40 rounded-full" />

        {segment.links.map((link, idx) => (
          <div key={link.id} className="flex items-center pl-2">
            {/* Short horizontal branch line */}
            <div className={cn('h-0.5 w-3', lineColor[link.status] || 'bg-border')} />
            <ChainNode
              user={link.toUser}
              label={link.status.toLowerCase()}
              statusClass={statusColor[link.status]}
              compact
            />
            {/* Status indicator dot */}
            <div className={cn('h-1.5 w-1.5 rounded-full ml-1', statusDot[link.status])} />
          </div>
        ))}

        {/* Progress indicator */}
        <div className="pl-2 flex items-center gap-1">
          <span className="text-[8px] text-muted-foreground/60">
            {t('groupProgress', { completed: completedCount, total })}
          </span>
        </div>
      </div>
    </div>
  );
}

function ChainLine({ status, message }: { status: string; message?: string }) {
  return (
    <div className="flex flex-col items-center mx-1">
      <div className={cn('h-0.5 w-8', lineColor[status] || 'bg-border')} />
      {message && (
        <span className="text-[9px] text-muted-foreground mt-0.5 max-w-16 truncate">
          {message}
        </span>
      )}
    </div>
  );
}

function ChainNode({
  user,
  label,
  statusClass,
  compact,
}: {
  user: User;
  label: string;
  statusClass?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-1', compact && 'gap-0.5')}>
      <div className={cn('rounded-full border p-0.5', statusClass || 'border-border')}>
        <Avatar className={cn(compact ? 'h-5 w-5' : 'h-7 w-7')}>
          <AvatarFallback className={cn('bg-secondary', compact ? 'text-[8px]' : 'text-[10px]')}>
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <span className={cn(
        'text-muted-foreground truncate',
        compact ? 'text-[8px] max-w-12' : 'text-[10px] max-w-14',
      )}>
        {user.name}
      </span>
      {!compact && (
        <span className="text-[8px] text-muted-foreground/60">{label}</span>
      )}
    </div>
  );
}
