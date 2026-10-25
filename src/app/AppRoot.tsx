import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { useBackgroundSync } from '@/features/alerts/logic/useBackgroundSync'
import { useForegroundAlerts } from '@/features/alerts/logic/useForegroundAlerts'
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
