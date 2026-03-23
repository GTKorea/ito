'use client';

import { useState, useEffect, type ReactNode } from 'react';

function isTauriCheck() {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  useEffect(() => {
    setIsTauriEnv(isTauriCheck());
  }, []);

  return (
    <>
      {isTauriEnv && (
        <div
          data-tauri-drag-region
          className="fixed top-0 left-0 right-0 h-[48px] z-50"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}
      {children}
    </>
  );
}
