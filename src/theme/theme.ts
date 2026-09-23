export type ThemeId = 'md3-light' | 'md3-dark' | 'black-night'

export interface ThemeDef {
  id: ThemeId
  label: string
  description: string
}

export const THEMES: readonly ThemeDef[] = [
  {
    id: 'md3-light',
    label: 'Material Light',
    description: 'Material Design 3 light theme',
  },
  {
    id: 'md3-dark',
    label: 'Material Dark',
    description: 'Material Design 3 dark theme',
  },
  {
    id: 'black-night',
    label: 'Black Night',
    description: 'Pure-black OLED theme for night sessions',
  },
]

export const DEFAULT_DARK_THEME: ThemeId = 'md3-dark'
export const DEFAULT_LIGHT_THEME: ThemeId = 'md3-light'

const THEME_STORAGE_KEY = 'clytrade.theme'

const THEME_IDS = new Set<string>(THEMES.map((theme) => theme.id))

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
