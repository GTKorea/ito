'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useNotificationStore } from '@/stores/notification-store';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandPalette } from '@/components/layout/command-palette';
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  const { fetchNotifications, listenToWs } = useNotificationStore();
  const router = useRouter();

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
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <CommandPalette />
      <OnboardingOverlay />
    </div>
  );
}
