'use client'

import { isTauri } from '@/lib/platform'
import { useAuthStore } from '@/stores/auth-store'

let listenerSetup = false

/** Process an ito:// deep link URL and log the user in */
function processDeepLinkUrl(url: string) {
  console.log('[tauri-oauth] Deep link received:', url)
  // Normalize ito:///callback (triple slash) to ito://callback
  const normalizedUrl = url.replace(/^ito:\/\/\//, 'ito://')
  if (normalizedUrl.startsWith('ito://callback')) {
    const parsed = new URL(normalizedUrl.replace('ito://', 'https://placeholder/'))
    const accessToken = parsed.searchParams.get('accessToken')
    const refreshToken = parsed.searchParams.get('refreshToken')

    if (accessToken && refreshToken) {
      const { setTokens, fetchUser } = useAuthStore.getState()
      setTokens(accessToken, refreshToken)
      fetchUser().then(() => {
        window.location.href = '/workspace'
      })
    }
  }
}

export async function setupDeepLinkListener() {
  if (!isTauri() || listenerSetup) return
  listenerSetup = true

  try {
    // 1. Listen for deep-link-received events from Rust (works for all platforms)
    const { listen } = await import('@tauri-apps/api/event')
    await listen<string>('deep-link-received', (event) => {
      processDeepLinkUrl(event.payload)
    })

    // 2. Also listen via the deep-link plugin JS API (macOS production)
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
    await onOpenUrl((urls) => {
      for (const url of urls) {
        processDeepLinkUrl(url)
      }
    })
  } catch (e) {
    // Not in Tauri environment or plugin not available
    console.warn('Deep link listener setup failed:', e)
  }
}
