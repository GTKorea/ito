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
    const state = crypto.randomUUID();

    if (isDesktop) {
      const url = `${API_URL}/auth/${provider}/init?from=${encodeURIComponent('ito://')}&state=${encodeURIComponent(state)}`;

      // 데스크톱: 반드시 외부 브라우저로 열어야 함
      let shellOpened = false;

      // 1차 시도: Tauri shell plugin
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        shellOpened = true;
      } catch (err) {
        console.warn('[OAuth] shell.open failed:', err);
      }

      // 2차 시도: Tauri invoke (shell plugin 없을 때)
      if (!shellOpened) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('plugin:shell|open', { path: url });
          shellOpened = true;
        } catch (err2) {
          console.warn('[OAuth] invoke shell failed:', err2);
        }
      }

      // 3차 시도: window.open (외부 팝업)
      if (!shellOpened) {
        try {
          const popup = window.open(url, '_blank');
          if (popup) shellOpened = true;
        } catch (err3) {
          console.warn('[OAuth] window.open failed:', err3);
        }
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
        // 모든 외부 브라우저 시도 실패 시에만 webview fallback
        console.error('[OAuth] All external browser methods failed, using webview fallback');
        const webUrl = `${API_URL}/auth/${provider}/init?from=${encodeURIComponent(window.location.origin)}&state=${encodeURIComponent(state)}`;
        window.location.href = webUrl;
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
            {pendingProvider === 'google' ? t('waitingForAuth') : t('continueWithGoogle')}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('github')}
            disabled={pendingProvider !== null}
          >
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
