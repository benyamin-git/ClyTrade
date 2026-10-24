import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { requestPersistentStorage } from '@/lib/storage'
import { SettingsI18nBridge } from './SettingsI18nBridge'
import { router } from './router'
import { UpdateBanner } from './UpdateBanner'

export function AppRoot() {
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  return (
    <SettingsI18nBridge>
      <RouterProvider router={router} />
      <UpdateBanner />
    </SettingsI18nBridge>
  )
}
