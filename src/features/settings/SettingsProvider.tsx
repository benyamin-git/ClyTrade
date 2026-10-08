import { useCallback, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_PREFERENCES, type Preferences } from '@/data/models/settings'
import {
  getPreferences,
  setPreferences as persistPreferences,
  updatePreferences as patchPreferences,
} from '@/data/repositories/settings.repo'
import { SettingsContext, type SettingsContextValue } from './SettingsContext'

interface StoredPreferences {
  preferences: Preferences
  error: Error | null
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const stored = useLiveQuery<StoredPreferences>(async () => {
    try {
      return { preferences: await getPreferences(), error: null }
    } catch (cause) {
      return {
        preferences: DEFAULT_PREFERENCES,
        error: cause instanceof Error ? cause : new Error(String(cause)),
      }
    }
  }, [])
  const preferences = stored?.preferences ?? DEFAULT_PREFERENCES

  const setPreferences = useCallback((next: Preferences) => {
    void persistPreferences(next)
  }, [])

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    void patchPreferences(patch)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      preferences,
      setPreferences,
      updatePreferences,
      ready: stored !== undefined && stored.error === null,
      error: stored?.error ?? null,
    }),
    [preferences, setPreferences, updatePreferences, stored],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
