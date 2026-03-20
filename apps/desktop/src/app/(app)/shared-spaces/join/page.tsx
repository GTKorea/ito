'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { useSharedSpaceStore } from '@/stores/shared-space-store';
import { Button } from '@/components/ui/button';
import { Globe, Check, AlertCircle } from 'lucide-react';

interface InviteInfo {
  sharedSpaceName: string;
  sharedSpaceDescription?: string;
  participantCount: number;
  todoCount: number;
  workspaceSlug: string;
  expiresAt: string;
}

export default function SharedSpaceJoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { acceptInvite } = useSharedSpaceStore();
  const t = useTranslations('sharedSpaces');

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invite token provided.');
      return;
    }
    api
      .get(`/shared-spaces/invites/${token}`)
      .then(({ data }) => setInviteInfo(data))
      .catch(() => setError('Invalid or expired invite.'));
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    try {
      await acceptInvite(token);
      setJoined(true);
      setTimeout(() => router.push('/shared-spaces'), 1500);
    } catch {
      setError('Failed to join. The invite may have expired.');
    } finally {
      setJoining(false);
    }
  };

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.push('/shared-spaces')}>
          {t('title')}
        </Button>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Check className="h-8 w-8 text-green-500" />
        <p className="text-sm font-medium">Joined!</p>
        <p className="text-xs text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (!inviteInfo) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
        <Globe className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-lg font-semibold">{inviteInfo.sharedSpaceName}</p>
        {inviteInfo.sharedSpaceDescription && (
          <p className="text-sm text-muted-foreground mt-1">
            {inviteInfo.sharedSpaceDescription}
          </p>
        )}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>{inviteInfo.participantCount} {t('workspaces')}</span>
          <span>{inviteInfo.todoCount} {t('todos')}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Your workspace ({inviteInfo.workspaceSlug}) has been invited to join this shared space.
        </p>
      </div>
      <Button onClick={handleJoin} disabled={joining}>
        {joining ? 'Joining...' : 'Accept & Join'}
      </Button>
    </div>
  );
}
