'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function Home() {
  const router = useRouter();
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser().then(() => {
      const token = localStorage.getItem('accessToken');
      router.push(token ? '/workspace' : '/login');
    });
  }, [fetchUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
          糸
        </div>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </div>
  );
}
