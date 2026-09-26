export type ThemeId = 'md3-light' | 'md3-dark' | 'black-night'

export const THEMES: readonly ThemeId[] = ['md3-light', 'md3-dark', 'black-night']

export const DEFAULT_DARK_THEME: ThemeId = 'md3-dark'
export const DEFAULT_LIGHT_THEME: ThemeId = 'md3-light'

const THEME_STORAGE_KEY = 'clytrade.theme'

const THEME_IDS = new Set<string>(THEMES)

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value)
}

export function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(stored)) return stored
  } catch {
    // storage unavailable
  }
  const fromDocument = document.documentElement.dataset.theme
  if (isThemeId(fromDocument)) return fromDocument
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? DEFAULT_LIGHT_THEME
    : DEFAULT_DARK_THEME
}

export function writeStoredTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // storage unavailable
  }
}
