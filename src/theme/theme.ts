export type ThemeId = 'light' | 'dark' | 'oled'

export const THEMES: readonly ThemeId[] = ['light', 'dark', 'oled']

export const DEFAULT_DARK_THEME: ThemeId = 'dark'
export const DEFAULT_LIGHT_THEME: ThemeId = 'light'

export const THEME_SURFACE_COLORS: Record<ThemeId, string> = {
  light: '#fffbfe',
  dark: '#1c1b1f',
  oled: '#000000',
}

export const LEGACY_THEME_MIGRATIONS: Readonly<Record<string, ThemeId>> = {
  'md3-light': 'light',
  'md3-dark': 'dark',
  'black-night': 'oled',
}

const THEME_STORAGE_KEY = 'clytrade.theme'

const THEME_IDS = new Set<string>(THEMES)

const LEGACY_THEME_IDS = new Map(Object.entries(LEGACY_THEME_MIGRATIONS))

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value)
}

export function readExplicitTheme(): ThemeId | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(stored)) return stored
    const migrated = stored === null ? undefined : LEGACY_THEME_IDS.get(stored)
    if (migrated) {
      writeStoredTheme(migrated)
      return migrated
    }
    return null
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
