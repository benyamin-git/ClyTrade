export type ThemeId = 'md3-light' | 'md3-dark' | 'black-night'

export const THEMES: readonly ThemeId[] = ['md3-light', 'md3-dark', 'black-night']

export const DEFAULT_DARK_THEME: ThemeId = 'md3-dark'
export const DEFAULT_LIGHT_THEME: ThemeId = 'md3-light'

export const THEME_SURFACE_COLORS: Record<ThemeId, string> = {
  'md3-light': '#fffbfe',
  'md3-dark': '#1c1b1f',
  'black-night': '#000000',
}

const THEME_STORAGE_KEY = 'clytrade.theme'

const THEME_IDS = new Set<string>(THEMES)

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value)
}

export function readExplicitTheme(): ThemeId | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(stored) ? stored : null
  } catch {
    return null
  }
}

export function readStoredTheme(): ThemeId {
  const stored = readExplicitTheme()
  if (stored) return stored
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

export function isDarkTheme(theme: ThemeId): boolean {
  return theme !== DEFAULT_LIGHT_THEME
}

export function syncNativeSystemBar(theme: ThemeId): void {
  window.ClyTradeNative?.setDarkTheme(isDarkTheme(theme))
}

export function syncIosStatusBar(theme: ThemeId): void {
  const meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (meta) meta.setAttribute('content', isDarkTheme(theme) ? 'black-translucent' : 'default')
}
