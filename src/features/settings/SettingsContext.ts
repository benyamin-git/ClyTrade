import { createContext, useContext } from 'react'
import type { Preferences } from '@/data/models/settings'

export interface SettingsContextValue {
  preferences: Preferences
  setPreferences: (preferences: Preferences) => void
  updatePreferences: (patch: Partial<Preferences>) => void
  ready: boolean
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function usePreferences(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('usePreferences must be used within a SettingsProvider')
  return context
}
