'use client';

import { CheckCircle2, Clock } from 'lucide-react';

interface CalendarEventProps {
  title: string;
  type: 'completed' | 'upcoming';
  assigneeName?: string;
}

export function CalendarEvent({ title, type, assigneeName }: CalendarEventProps) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] leading-tight truncate ${
        type === 'completed'
          ? 'bg-green-500/10 text-green-400'
          : 'bg-orange-500/10 text-orange-400'
      }`}
    >
      {type === 'completed' ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : (
        <Clock className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{title}</span>
    </div>
  );
}
