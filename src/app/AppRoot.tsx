import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { useBackgroundSync } from '@/features/alerts/logic/useBackgroundSync'
import { useForegroundAlerts } from '@/features/alerts/logic/useForegroundAlerts'
import { consumeNativePendingRoute } from '@/lib/native'
import { requestPersistentStorage } from '@/lib/storage'
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

  return (
    <SettingsI18nBridge>
      <BackgroundSync />
      <ForegroundAlerts />
      <RouterProvider router={router} />
      <UpdateBanner />
      <WindowsClosePrompt />
    </SettingsI18nBridge>
  )
}
