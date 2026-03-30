'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorBoundary');

  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/workspace'}>
            <Home className="mr-1.5 h-3.5 w-3.5" />
            {t('goHome')}
          </Button>
          <Button size="sm" onClick={reset}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t('tryAgain')}
          </Button>
        </div>
      </div>
    </div>
  );
}
