'use client';

import { type ReactNode } from 'react';
import { isTauri } from '@/lib/platform';

export default function AuthLayout({ children }: { children: ReactNode }) {
  // Synchronous check on client — avoids flicker from useEffect/useState cycle.
  // On server (SSR), isTauri() returns false so the drag region is omitted in HTML,
  // but since `decorations: false` is set in tauri.conf.json, the native titlebar
  // is already hidden and the first client paint immediately adds the drag region.
  const isTauriEnv = isTauri();

  return (
    <>
      {isTauriEnv && (
        <div
          data-tauri-drag-region
          className="fixed top-0 left-0 right-0 h-[32px] z-50"
          style={{
            WebkitAppRegion: 'drag',
            // Only the empty titlebar area is draggable — buttons below are not blocked
            // because this div contains no interactive children
          } as React.CSSProperties}
        />
      )}
      {children}
    </>
  );
}
