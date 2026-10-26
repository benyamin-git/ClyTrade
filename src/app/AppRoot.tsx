import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { useBackgroundSync } from '@/features/alerts/logic/useBackgroundSync'
import { useForegroundAlerts } from '@/features/alerts/logic/useForegroundAlerts'
import { useAutoPriceSync } from '@/features/portfolio/logic/useAutoPriceSync'
import { useSymbolMappingSync } from '@/market/useSymbolMappingSync'
import { consumeNativePendingRoute } from '@/lib/native'
import { requestPersistentStorage } from '@/lib/storage'
import { APP_PLATFORM } from '@/lib/version'
import { SettingsI18nBridge } from './SettingsI18nBridge'
import { router } from './router'
import { UpdateBanner } from './UpdateBanner'
import { WindowsClosePrompt } from './shell/WindowsClosePrompt'

function BackgroundSync(): null {
  useBackgroundSync()
  return null
}

function ForegroundAlerts(): null {
  useForegroundAlerts()
  return null
}

function AutoPriceSync(): null {
  useAutoPriceSync()
  return null
}

function SymbolMappingSync(): null {
  useSymbolMappingSync()
  return null
}

export function AppRoot() {
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  useEffect(() => {
    const openPendingRoute = () => {
      const route = consumeNativePendingRoute()
      if (route) void router.navigate(route)
    }

    openPendingRoute()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') openPendingRoute()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', openPendingRoute)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', openPendingRoute)
    }
  }, [])

  useEffect(() => {
    if (APP_PLATFORM === 'web') return
    let active = true
    let unlisten: (() => void) | null = null

    void import('@tauri-apps/plugin-notification')
      .then(({ onAction }) =>
        onAction((notification) => {
          const route = notification.extra?.route
          if (typeof route === 'string' && route.startsWith('/')) {
            void router.navigate(route)
          }
        }),
      )
      .then((listener) => {
        if (!active) {
          void listener.unregister()
          return
        }
        unlisten = () => void listener.unregister()
      })
      .catch(() => undefined)

    return () => {
      active = false
      unlisten?.()
    }
  }, [])

  return (
    <SettingsI18nBridge>
      <BackgroundSync />
      <ForegroundAlerts />
      <AutoPriceSync />
      <SymbolMappingSync />
      <RouterProvider router={router} />
      <UpdateBanner />
      <WindowsClosePrompt />
    </SettingsI18nBridge>
  )
}
