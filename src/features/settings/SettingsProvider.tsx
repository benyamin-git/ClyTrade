import { useCallback, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_PREFERENCES, type Preferences } from '@/data/models/settings'
import {
  getPreferences,
  setPreferences as persistPreferences,
} from '@/data/repositories/settings.repo'
import { SettingsContext, type SettingsContextValue } from './SettingsContext'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const stored = useLiveQuery(() => getPreferences(), [], DEFAULT_PREFERENCES)
  const preferences = stored ?? DEFAULT_PREFERENCES

  const setPreferences = useCallback((next: Preferences) => {
    void persistPreferences(next)
  }, [])

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => {
      void persistPreferences({ ...preferences, ...patch })
    },
    [preferences],
  )

  const value = useMemo<SettingsContextValue>(
    () => ({
      preferences,
      setPreferences,
      updatePreferences,
      ready: stored !== undefined,
    }),
    [preferences, setPreferences, updatePreferences, stored],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
