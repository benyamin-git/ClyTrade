import type { ReactNode } from 'react'
import { usePreferences } from '@/features/settings/SettingsContext'
import { I18nProvider } from '@/i18n/I18nProvider'

export function SettingsI18nBridge({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences } = usePreferences()
  return (
    <I18nProvider
      preference={preferences.language}
      onPreferenceChange={(language) => updatePreferences({ language })}
    >
      {children}
    </I18nProvider>
  )
}
