'use client';

import { useEffect } from 'react';
import { isTauri } from '@/lib/platform';
import { setupDeepLinkListener } from '@/lib/tauri-oauth';

export function TauriDeepLinkListener() {
  useEffect(() => {
    if (isTauri()) {
      setupDeepLinkListener();
    }
  }, []);

  return null;
}
