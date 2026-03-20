'use client'

import { isTauri } from '@/lib/platform'
import { useAuthStore } from '@/stores/auth-store'

let listenerSetup = false

export async function setupDeepLinkListener() {
  if (!isTauri() || listenerSetup) return
  listenerSetup = true

  try {
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link')

    await onOpenUrl((urls) => {
      for (const url of urls) {
        console.log('[tauri-oauth] Deep link received:', url)
        // Normalize ito:///callback (triple slash) to ito://callback
        const normalizedUrl = url.replace(/^ito:\/\/\//, 'ito://')
        if (normalizedUrl.startsWith('ito://callback')) {
          // Replace ito:// with https://placeholder/ so URL parsing works
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
    })
  } catch (e) {
    // Not in Tauri environment or plugin not available
    console.warn('Deep link listener setup failed:', e)
  }
}
