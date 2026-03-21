'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { isTauri } from '@/lib/platform';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthPending, setIsOAuthPending] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsDesktop(isTauri());
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/workspace');
    } catch {
      setError(t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (isDesktop) {
      const state = crypto.randomUUID();
      const url = `${API_URL}/auth/${provider}/init?from=${encodeURIComponent('ito://')}&state=${encodeURIComponent(state)}`;
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
      } catch {
        window.location.href = url;
        return;
      }

      setIsOAuthPending(true);

      // Poll for OAuth result (cookie-free fallback; works in dev mode too)
      pollRef.current = setInterval(async () => {
        // Stop if already logged in (deep link may have worked)
        if (useAuthStore.getState().isAuthenticated) {
          if (pollRef.current) clearInterval(pollRef.current);
          setIsOAuthPending(false);
          return;
        }
        try {
          const res = await fetch(`${API_URL}/auth/oauth-result?state=${state}`);
          if (res.ok) {
            if (pollRef.current) clearInterval(pollRef.current);
            const { accessToken, refreshToken } = await res.json();
            const { setTokens, fetchUser } = useAuthStore.getState();
            setTokens(accessToken, refreshToken);
            await fetchUser();
            router.push('/workspace');
          }
        } catch {
          // Not ready yet, keep polling
        }
      }, 2000);

      // Stop polling after 5 minutes
      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        setIsOAuthPending(false);
      }, 5 * 60 * 1000);
    } else {
      // Web: navigate directly, callback redirects back to this origin.
      const from = window.location.origin;
      const url = `${API_URL}/auth/${provider}/init?from=${encodeURIComponent(from)}`;
      window.location.href = url;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            糸
          </div>
          <h1 className="text-xl font-semibold">{t('signInTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('signInSubtitle')}
          </p>
        </div>

        {/* OAuth */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('google')}
            disabled={isOAuthPending}
          >
            {isOAuthPending ? t('waitingForAuth') : t('continueWithGoogle')}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('github')}
            disabled={isOAuthPending}
          >
            {t('continueWithGithub')}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{tc('or')}</span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('signingIn') : t('signIn')}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
