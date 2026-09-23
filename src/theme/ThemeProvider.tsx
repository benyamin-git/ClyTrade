import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStoredAccent, THEME_NATIVE_ACCENT, writeStoredAccent, type AccentId } from './accents'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'
import { readStoredTheme, writeStoredTheme, type ThemeId } from './theme'

function applyTheme(theme: ThemeId, accent: AccentId): void {
  const root = document.documentElement
  root.dataset.theme = theme
  if (accent === THEME_NATIVE_ACCENT) {
    delete root.dataset.accent
  } else {
    root.dataset.accent = accent
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const surface = getComputedStyle(root).getPropertyValue('--md-sys-color-surface').trim()
    if (surface) meta.setAttribute('content', surface)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme())
  const [accent, setAccentState] = useState<AccentId>(() => readStoredAccent())

  useEffect(() => {
    applyTheme(theme, accent)
    writeStoredTheme(theme)
    writeStoredAccent(accent)
  }, [theme, accent])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
  }, [])

  const setAccent = useCallback((next: AccentId) => {
    setAccentState(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, accent, setAccent }),
    [theme, setTheme, accent, setAccent],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
