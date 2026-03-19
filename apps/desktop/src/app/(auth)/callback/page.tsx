'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, fetchUser } = useAuthStore();
  const t = useTranslations('common');

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      fetchUser().then(() => router.push('/workspace'));
    } else {
      router.push('/login');
    }
  }, [searchParams, setTokens, fetchUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{t('authenticating')}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  const t = useTranslations('common');

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
