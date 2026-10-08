import type { ReactNode } from 'react'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'

export function PreferencesGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { ready, error } = usePreferences()
  if (error) {
    return (
      <div role="alert" className="flex h-full items-center justify-center text-sm text-error">
        {t('preferences.loadFailed')}
      </div>
    )
  }
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">
        {t('common.loading')}
      </div>
    )
  }
  return <>{children}</>
}
