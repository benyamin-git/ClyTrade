import { createContext, useContext } from 'react'
import type { AccentId } from './accents'
import type { ThemeId } from './theme'

export interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  accent: AccentId
  setAccent: (accent: AccentId) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
