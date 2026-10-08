import { ACCENTS, DEFAULT_ACCENT, THEME_NATIVE_ACCENT } from './accents.ts'
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  isDarkTheme,
  THEMES,
  THEME_SURFACE_COLORS,
} from './theme.ts'

export const THEME_INIT_PLACEHOLDER = '__THEME_INIT__'

export function injectThemeInit(html: string): string {
  const config = {
    accents: ACCENTS,
    defaultAccent: DEFAULT_ACCENT,
    nativeAccent: THEME_NATIVE_ACCENT,
    themes: THEMES,
    darkThemes: THEMES.filter(isDarkTheme),
    lightTheme: DEFAULT_LIGHT_THEME,
    darkTheme: DEFAULT_DARK_THEME,
    surfaces: THEME_SURFACE_COLORS,
  }
  return html.replace(THEME_INIT_PLACEHOLDER, JSON.stringify(config))
}
