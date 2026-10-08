import { ACCENTS, DEFAULT_ACCENT, LEGACY_ACCENT_MIGRATIONS } from './accents.ts'
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  isDarkTheme,
  LEGACY_THEME_MIGRATIONS,
  THEMES,
  THEME_SURFACE_COLORS,
} from './theme.ts'

export const THEME_INIT_PLACEHOLDER = '__THEME_INIT__'

export function injectThemeInit(html: string): string {
  const config = {
    accents: ACCENTS,
    defaultAccent: DEFAULT_ACCENT,
    accentMigrations: LEGACY_ACCENT_MIGRATIONS,
    themes: THEMES,
    themeMigrations: LEGACY_THEME_MIGRATIONS,
    darkThemes: THEMES.filter(isDarkTheme),
    lightTheme: DEFAULT_LIGHT_THEME,
    darkTheme: DEFAULT_DARK_THEME,
    surfaces: THEME_SURFACE_COLORS,
  }
  return html.replace(THEME_INIT_PLACEHOLDER, JSON.stringify(config))
}
