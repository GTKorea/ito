'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isTauri } from '@/lib/platform';
import { useAuthStore } from '@/stores/auth-store';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const [isDesktop, setIsDesktop] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const desktop = isTauri();
    setIsDesktop(desktop);
    if (desktop) {
      fetchUser().finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDesktop || checking || isLoading) return;
    router.replace(isAuthenticated ? '/workspace' : '/login');
  }, [isDesktop, checking, isLoading, isAuthenticated, router]);

  if (isDesktop) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
