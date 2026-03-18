'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InviteInfo {
  workspaceName: string;
  inviterName?: string;
}

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { fetchWorkspaces } = useWorkspaceStore();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invite token provided.');
      setIsLoading(false);
      return;
    }

    const fetchInviteInfo = async () => {
      try {
        const { data } = await api.get(`/workspaces/invites/${token}`);
        setInviteInfo(data);
      } catch {
        setError('This invite link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInviteInfo();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsJoining(true);
    setError(null);
    try {
      await api.post(`/workspaces/join/${token}`);
      setJoined(true);
      await fetchWorkspaces();
      setTimeout(() => router.push('/workspace'), 1500);
    } catch {
      setError('Failed to join workspace. The invite may have expired.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading invite...</p>
          </div>
        ) : error && !inviteInfo ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Invalid Invite</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => router.push('/workspace')}
            >
              Go to Workspace
            </Button>
          </div>
        ) : joined ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Joined!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Redirecting to workspace...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <Building2 className="h-7 w-7 text-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                You&apos;ve been invited to join
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {inviteInfo?.workspaceName}
              </p>
              {inviteInfo?.inviterName && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Invited by {inviteInfo.inviterName}
                </p>
              )}
            </div>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <Button
              className="mt-2 w-full"
              onClick={handleAccept}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Accept Invite'
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => router.push('/workspace')}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
