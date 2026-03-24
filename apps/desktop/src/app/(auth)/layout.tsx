'use client';

import { type ReactNode } from 'react';
import { isTauri } from '@/lib/platform';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const isTauriEnv = isTauri();

  return (
    <div suppressHydrationWarning>
      {isTauriEnv && (
        <div
          data-tauri-drag-region
          className="fixed top-0 left-[70px] right-0 h-[32px] z-50"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}
      {children}
    </div>
  );
}
