'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CommandPalette } from '@/components/layout/command-palette';
import { TopHeader } from '@/components/layout/top-header';
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay';
import { cn } from '@/lib/utils';
import { isTauri } from '@/lib/platform';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  const { fetchNotifications, listenToWs } = useNotificationStore();
  const router = useRouter();
  const { isMobile, isTablet } = useMediaQuery();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  useEffect(() => {
    setIsTauriEnv(isTauri());
  }, []);

  useEffect(() => {
    // Only fetch if not already authenticated (avoid overriding login() state on mount)
    if (!isAuthenticated) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (isAuthenticated) {
      fetchWorkspaces();
      fetchNotifications();
      listenToWs();
    }
  }, [isAuthenticated, isLoading, router, fetchWorkspaces, fetchNotifications, listenToWs]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {!isMobile && (
        <Sidebar
          collapsed={isTablet && sidebarCollapsed}
          onToggleCollapse={isTablet ? () => setSidebarCollapsed((prev) => !prev) : undefined}
        />
      )}
      <main className={cn('flex-1 flex flex-col overflow-hidden', isMobile && 'pb-16')}>
        {!isMobile && isTauriEnv && <TopHeader />}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
      {isMobile && <BottomNav />}
      <CommandPalette />
      <OnboardingOverlay />
    </div>
  );
}
