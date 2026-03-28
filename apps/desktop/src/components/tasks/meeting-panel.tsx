'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { useTaskStore } from '@/stores/task-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, Users, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MeetingPanelProps {
  taskId: string;
  voteConfig: {
    mode: string;
    options: string[];
    allowChange?: boolean;
    scheduledAt: string;
    duration?: number;
    agenda?: string;
    confirmed: boolean;
    confirmedAt?: string;
  };
  isCreator: boolean;
}

interface MeetingUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface MeetingStatus {
  scheduledAt: string;
  duration?: number;
  agenda?: string;
  confirmed: boolean;
  confirmedAt?: string;
  userResponse?: string;
  isDismissed: boolean;
  attending: MeetingUser[];
  declined: MeetingUser[];
  pending: MeetingUser[];
  totalInvited: number;
}

export function MeetingPanel({ taskId, voteConfig, isCreator }: MeetingPanelProps) {
  const t = useTranslations('tasks');
  const { confirmMeeting, rescheduleMeeting } = useTaskStore();
  const [status, setStatus] = useState<MeetingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const fetchStatus = async () => {
    try {
      const { data } = await api.get(`/tasks/${taskId}/meeting/status`);
      setStatus(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [taskId]);

  const handleRsvp = async (choice: 'attend' | 'decline') => {
    setIsSubmitting(true);
    try {
      await api.post(`/tasks/${taskId}/vote`, { choice });
      await fetchStatus();
      toast.success(choice === 'attend' ? t('meetingAttend') : t('meetingDecline'));
    } catch {
      toast.error('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmMeeting(taskId);
      await fetchStatus();
      toast.success(t('meetingConfirmed'));
    } catch {
      toast.error('Failed to confirm meeting');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) return;
    setIsConfirming(true);
    try {
      const scheduledAt = new Date(`${newDate}T${newTime}`).toISOString();
      await rescheduleMeeting(taskId, scheduledAt, voteConfig.duration);
      setShowReschedule(false);
      setNewDate('');
      setNewTime('');
      await fetchStatus();
      toast.success(t('meetingReschedule'));
    } catch {
      toast.error('Failed to reschedule');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status) return null;

  const scheduledDate = new Date(status.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
      {/* Meeting info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <span className="font-medium">{dateStr}</span>
          <Clock className="h-4 w-4 text-muted-foreground ml-2" />
          <span>{timeStr}</span>
          {status.duration && (
            <span className="text-muted-foreground">
              ({t('meetingDurationMinutes', { duration: status.duration })})
            </span>
          )}
        </div>
        {status.agenda && (
          <p className="text-sm text-muted-foreground pl-6">{status.agenda}</p>
        )}
      </div>

      {/* Status badge */}
      {status.confirmed ? (
        <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-400">
          <Check className="h-3 w-3" />
          {t('meetingConfirmed')}
        </div>
      ) : (
        <div className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-400">
          <Users className="h-3 w-3" />
          {t('meetingPending')}
        </div>
      )}

      {/* Attendance summary */}
      <div className="space-y-2">
        {status.attending.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 font-medium w-16">
              {t('meetingAttendees', { count: status.attending.length })}
            </span>
            <div className="flex -space-x-1.5">
              {status.attending.map((u) => (
                <Avatar key={u.id} className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[8px] bg-emerald-500/20 text-emerald-400">
                    {u.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        )}
        {status.declined.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400 font-medium w-16">
              {t('meetingDeclinedCount', { count: status.declined.length })}
            </span>
            <div className="flex -space-x-1.5">
              {status.declined.map((u) => (
                <Avatar key={u.id} className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[8px] bg-red-500/20 text-red-400">
                    {u.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        )}
        {status.pending.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium w-16">
              {t('meetingPendingCount', { count: status.pending.length })}
            </span>
            <div className="flex -space-x-1.5">
              {status.pending.map((u) => (
                <Avatar key={u.id} className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[8px]">
                    {u.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RSVP buttons (for non-creator participants) */}
      {!isCreator && !status.confirmed && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={status.userResponse === 'attend' ? 'default' : 'outline'}
            className={cn(
              'h-8 text-xs',
              status.userResponse === 'attend' && 'bg-emerald-600 hover:bg-emerald-700',
            )}
            disabled={isSubmitting}
            onClick={() => handleRsvp('attend')}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {t('meetingAttend')}
          </Button>
          <Button
            size="sm"
            variant={status.userResponse === 'decline' ? 'default' : 'outline'}
            className={cn(
              'h-8 text-xs',
              status.userResponse === 'decline' && 'bg-red-600 hover:bg-red-700',
            )}
            disabled={isSubmitting}
            onClick={() => handleRsvp('decline')}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t('meetingDecline')}
          </Button>
        </div>
      )}

      {/* Creator actions */}
      {isCreator && !status.confirmed && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <Button
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            disabled={isConfirming}
            onClick={handleConfirm}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {t('meetingConfirm')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setShowReschedule(!showReschedule)}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {t('meetingReschedule')}
          </Button>
        </div>
      )}

      {/* Reschedule form */}
      {showReschedule && (
        <div className="flex items-center gap-2 pl-2">
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-8 text-xs w-36"
          />
          <Input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="h-8 text-xs w-28"
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={!newDate || !newTime || isConfirming}
            onClick={handleReschedule}
          >
            {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('pullSend')}
          </Button>
        </div>
      )}
    </div>
  );
}
