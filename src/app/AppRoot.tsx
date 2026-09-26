import { RouterProvider } from 'react-router'
import { SettingsI18nBridge } from './SettingsI18nBridge'
import { router } from './router'

export function AppRoot() {
  return (
    <SettingsI18nBridge>
      <RouterProvider router={router} />
    </SettingsI18nBridge>
  )
}
