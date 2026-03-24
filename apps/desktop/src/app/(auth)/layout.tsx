'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { isTauri } from '@/lib/platform';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  useEffect(() => {
    setIsTauriEnv(isTauri());
  }, []);

  return (
    <div suppressHydrationWarning>
      {isTauriEnv && (
        <div
          data-tauri-drag-region
          className="fixed top-0 left-0 right-0 h-[32px] z-50"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}
      {children}
    </div>
  );
}
