'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('invite');

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('noToken'));
      setIsLoading(false);
      return;
    }

    const fetchInviteInfo = async () => {
      try {
        const { data } = await api.get(`/workspaces/invites/${token}`);
        setInviteInfo(data);
      } catch {
        setError(t('expiredOrInvalid'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInviteInfo();
  }, [token, t]);

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
      setError(t('failedToJoin'));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <div className="w-full max-w-sm rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#888888]" />
            <p className="text-sm text-[#888888]">{t('loadingInvite')}</p>
          </div>
        ) : error && !inviteInfo ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#ECECEC]">{t('invalidInvite')}</p>
              <p className="mt-1 text-xs text-[#888888]">{error}</p>
            </div>
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => router.push('/workspace')}
            >
              {t('goToWorkspace')}
            </Button>
          </div>
        ) : joined ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#ECECEC]">{t('joined')}</p>
              <p className="mt-1 text-xs text-[#888888]">
                {t('redirecting')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2A2A2A]">
              <Building2 className="h-7 w-7 text-[#ECECEC]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#ECECEC]">
                {t('youveBeenInvited')}
              </p>
              <p className="mt-1 text-lg font-semibold text-[#ECECEC]">
                {inviteInfo?.workspaceName}
              </p>
              {inviteInfo?.inviterName && (
                <p className="mt-1 text-xs text-[#888888]">
                  {t('invitedBy', { name: inviteInfo.inviterName })}
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
                  {t('joining')}
                </>
              ) : (
                t('acceptInvite')
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-[#888888]"
              onClick={() => router.push('/workspace')}
            >
              {t('goToWorkspace')}
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
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
          <Loader2 className="h-8 w-8 animate-spin text-[#888888]" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
