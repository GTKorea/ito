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
  const [pendingProvider, setPendingProvider] = useState<'google' | 'github' | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const { login, isAuthenticated } = useAuthStore();
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

  // 이미 로그인된 상태면 workspace로 리디렉트
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/workspace');
    }
  }, [isAuthenticated, router]);

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

      let shellOpened = false;
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        shellOpened = true;
      } catch (err) {
        console.warn('[OAuth] shell.open failed, falling back to webview navigation:', err);
      }

      if (shellOpened) {
        // 외부 브라우저가 열렸으면 polling으로 결과 대기
        setPendingProvider(provider);

        pollRef.current = setInterval(async () => {
          if (useAuthStore.getState().isAuthenticated) {
            if (pollRef.current) clearInterval(pollRef.current);
            setPendingProvider(null);
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

        timeoutRef.current = setTimeout(() => {
          if (pollRef.current) clearInterval(pollRef.current);
          setPendingProvider(null);
        }, 5 * 60 * 1000);
      } else {
        // shell plugin 실패 → webview에서 직접 OAuth 진행 (웹 플로우 사용)
        // from을 웹 origin으로 보내서 서버가 /callback으로 리디렉트하도록 함
        const webUrl = `${API_URL}/auth/${provider}/init?from=${encodeURIComponent(window.location.origin)}&state=${encodeURIComponent(state)}`;
        window.location.href = webUrl;
        return;
      }
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
            disabled={pendingProvider !== null}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {pendingProvider === 'google' ? t('waitingForAuth') : t('continueWithGoogle')}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('github')}
            disabled={pendingProvider !== null}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            {pendingProvider === 'github' ? t('waitingForAuth') : t('continueWithGithub')}
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
