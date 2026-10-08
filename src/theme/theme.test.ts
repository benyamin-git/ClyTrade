import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  isDarkTheme,
  LEGACY_THEME_MIGRATIONS,
  readExplicitTheme,
  syncIosStatusBar,
  syncNativeSystemBar,
  THEME_SURFACE_COLORS,
  type ThemeId,
} from './theme'

const THEME_CSS: Record<ThemeId, string> = {
  light: 'src/theme/themes/light.css',
  dark: 'src/theme/themes/dark.css',
  oled: 'src/theme/themes/oled.css',
}

describe('native system bar bridge', () => {
  afterEach(() => {
    delete window.ClyTradeNative
  })

  it.each([
    ['light', false],
    ['dark', true],
    ['oled', true],
  ] as const)('reports %s as dark: %s', (theme, dark) => {
    expect(isDarkTheme(theme)).toBe(dark)
  })

  it('forwards the dark flag to the native bridge when present', () => {
    const setDarkTheme = vi.fn()
    window.ClyTradeNative = { setDarkTheme }

    syncNativeSystemBar('light')
    expect(setDarkTheme).toHaveBeenCalledWith(false)

    syncNativeSystemBar('oled')
    expect(setDarkTheme).toHaveBeenLastCalledWith(true)
  })

  it('does nothing when the native bridge is absent', () => {
    expect(() => syncNativeSystemBar('dark')).not.toThrow()
  })
})

describe('ios status bar', () => {
  function statusBarMeta(): HTMLMetaElement {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
    document.head.appendChild(meta)
    return meta
  }

  afterEach(() => {
    document.head.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.remove()
  })

  it.each([
    ['light', 'default'],
    ['dark', 'black-translucent'],
    ['oled', 'black-translucent'],
  ] as const)('sets the %s theme to %s', (theme, expected) => {
    const meta = statusBarMeta()
    syncIosStatusBar(theme)
    expect(meta.getAttribute('content')).toBe(expected)
  })

  it('does nothing when the meta tag is absent', () => {
    expect(() => syncIosStatusBar('light')).not.toThrow()
  })
})

describe('explicit theme storage', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('returns the stored theme', () => {
    localStorage.setItem('clytrade.theme', 'oled')
    expect(readExplicitTheme()).toBe('oled')
  })

  it('returns null when nothing is stored', () => {
    expect(readExplicitTheme()).toBeNull()
  })

  it.each(Object.entries(LEGACY_THEME_MIGRATIONS))(
    'migrates the legacy %s theme to %s and rewrites it',
    (legacy, expected) => {
      localStorage.setItem('clytrade.theme', legacy)
      expect(readExplicitTheme()).toBe(expected)
      expect(localStorage.getItem('clytrade.theme')).toBe(expected)
    },
  )

  it.each(['sepia', 'constructor', 'toString'])(
    'returns null for the unknown stored value %s',
    (value) => {
      localStorage.setItem('clytrade.theme', value)
      expect(readExplicitTheme()).toBeNull()
    },
  )

  it('ignores the theme applied pre-paint', () => {
    document.documentElement.dataset.theme = 'light'
    expect(readExplicitTheme()).toBeNull()
  })
})

describe('theme surface colors', () => {
  it.each(Object.keys(THEME_CSS) as ThemeId[])('matches the %s stylesheet surface', (themeId) => {
    const css = readFileSync(resolve(process.cwd(), THEME_CSS[themeId]), 'utf8')
    expect(css).toContain(`--md-sys-color-surface: ${THEME_SURFACE_COLORS[themeId]};`)
  })
})
