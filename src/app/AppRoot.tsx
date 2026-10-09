import { RouterProvider } from 'react-router'
import { SettingsI18nBridge } from './SettingsI18nBridge'
import { router } from './router'
import { UpdateBanner } from './UpdateBanner'

export function AppRoot() {
  return (
    <SettingsI18nBridge>
      <RouterProvider router={router} />
      <UpdateBanner />
    </SettingsI18nBridge>
  )
}
