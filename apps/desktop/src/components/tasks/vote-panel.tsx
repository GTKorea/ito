'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Vote, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VotePanelProps {
  taskId: string;
  voteConfig: {
    mode: 'approve_reject' | 'custom';
    options: string[];
    allowChange?: boolean;
    anonymous?: boolean;
  };
  isCreator: boolean;
}

interface VoteStatus {
  hasVoted: boolean;
  userChoice?: string;
  totalVoters: number;
  votedCount: number;
  isComplete: boolean;
}

interface VoteResult {
  option: string;
  count: number;
  voters: Array<{ id: string; name: string; avatarUrl?: string }>;
}

interface VoteResults {
  results: VoteResult[];
  totalVotes: number;
  userVote?: string;
  anonymous: boolean;
}

export function VotePanel({ taskId, voteConfig, isCreator }: VotePanelProps) {
  const t = useTranslations('tasks');
  const [status, setStatus] = useState<VoteStatus | null>(null);
  const [results, setResults] = useState<VoteResults | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get(`/tasks/${taskId}/vote/status`);
      setStatus(data);
      if (data.hasVoted || isCreator) {
        fetchResults();
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const { data } = await api.get(`/tasks/${taskId}/vote/results`);
      setResults(data);
    } catch {
      // silent — user may not have voted yet
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [taskId]);

  const handleVote = async () => {
    if (!selectedChoice) return;
    setIsSubmitting(true);
    try {
      await api.post(`/tasks/${taskId}/vote`, {
        choice: selectedChoice,
        comment: comment || undefined,
      });
      toast.success(t('voteSubmitted'));
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('voteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showResults = status?.hasVoted || isCreator;
  const maxVotes = results ? Math.max(...results.results.map(r => r.count), 1) : 1;

  const getOptionLabel = (option: string) => {
    if (voteConfig.mode === 'approve_reject') {
      if (option === 'approve') return t('voteApprove');
      if (option === 'reject') return t('voteReject');
      if (option === 'abstain') return t('voteAbstain');
    }
    return option;
  };

  return (
    <div className="space-y-3">
      {/* Vote progress */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Vote className="h-3.5 w-3.5" />
        <span>{t('votedCount', { voted: status?.votedCount ?? 0, total: status?.totalVoters ?? 0 })}</span>
        {status?.isComplete && (
          <span className="text-green-500 font-medium">{t('voteComplete')}</span>
        )}
      </div>

      {/* Results view */}
      {showResults && results && (
        <div className="space-y-2">
          {results.results.map((r) => (
            <div key={r.option} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={cn(
                  'font-medium',
                  results.userVote === r.option && 'text-primary'
                )}>
                  {getOptionLabel(r.option)}
                  {results.userVote === r.option && ' \u2713'}
                </span>
                <span className="text-muted-foreground">
                  {r.count} ({results.totalVotes > 0 ? Math.round((r.count / results.totalVotes) * 100) : 0}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    results.userVote === r.option ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  style={{ width: `${(r.count / maxVotes) * 100}%` }}
                />
              </div>
              {!results.anonymous && r.voters.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {r.voters.map(v => (
                    <span key={v.id} className="text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                      {v.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Voting form (if not voted, or allowChange) */}
      {(!status?.hasVoted || voteConfig.allowChange) && !isCreator && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {voteConfig.options.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedChoice(option)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                  selectedChoice === option
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {getOptionLabel(option)}
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('voteCommentPlaceholder')}
            rows={2}
            className="text-xs resize-none"
          />
          <Button
            size="sm"
            onClick={handleVote}
            disabled={!selectedChoice || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {status?.hasVoted ? t('changeVote') : t('castVote')}
          </Button>
        </div>
      )}
    </div>
  );
}
