import type { ReactNode } from 'react'
import { usePreferences } from '@/features/settings/SettingsContext'

export function PreferencesGate({ children }: { children: ReactNode }) {
  const { ready } = usePreferences()
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
        Loading…
      </div>
    )
  }
  return <>{children}</>
}
