import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStoredAccent, writeStoredAccent, type AccentId } from './accents'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  readExplicitTheme,
  readStoredTheme,
  syncIosStatusBar,
  syncNativeSystemBar,
  writeStoredTheme,
  type ThemeId,
} from './theme'

function syncThemeColor(): void {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  requestAnimationFrame(() => {
    const surface = getComputedStyle(document.documentElement)
      .getPropertyValue('--md-sys-color-surface')
      .trim()
    if (surface) meta.setAttribute('content', surface)
  })
}

function applyTheme(theme: ThemeId, accent: AccentId): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.accent = accent
  syncNativeSystemBar(theme)
  syncIosStatusBar(theme)
  syncThemeColor()
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme())
  const [accent, setAccentState] = useState<AccentId>(() => readStoredAccent())
  const [followsSystem, setFollowsSystem] = useState(() => readExplicitTheme() === null)

  useEffect(() => {
    applyTheme(theme, accent)
    writeStoredAccent(accent)
  }, [theme, accent])

  useEffect(() => {
    if (!followsSystem) return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [followsSystem])

  const setTheme = useCallback((next: ThemeId) => {
    writeStoredTheme(next)
    setFollowsSystem(false)
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
