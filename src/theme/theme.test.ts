import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  isDarkTheme,
  readExplicitTheme,
  syncIosStatusBar,
  syncNativeSystemBar,
  THEME_SURFACE_COLORS,
  type ThemeId,
} from './theme'

const THEME_CSS: Record<ThemeId, string> = {
  'md3-light': 'src/theme/themes/md3-light.css',
  'md3-dark': 'src/theme/themes/md3-dark.css',
  'black-night': 'src/theme/themes/black-night.css',
}

describe('native system bar bridge', () => {
  afterEach(() => {
    delete window.ClyTradeNative
  })

  it.each([
    ['md3-light', false],
    ['md3-dark', true],
    ['black-night', true],
  ] as const)('reports %s as dark: %s', (theme, dark) => {
    expect(isDarkTheme(theme)).toBe(dark)
  })

  it('forwards the dark flag to the native bridge when present', () => {
    const setDarkTheme = vi.fn()
    window.ClyTradeNative = { setDarkTheme }

    syncNativeSystemBar('md3-light')
    expect(setDarkTheme).toHaveBeenCalledWith(false)

    syncNativeSystemBar('black-night')
    expect(setDarkTheme).toHaveBeenLastCalledWith(true)
  })

  it('does nothing when the native bridge is absent', () => {
    expect(() => syncNativeSystemBar('md3-dark')).not.toThrow()
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
    ['md3-light', 'default'],
    ['md3-dark', 'black-translucent'],
    ['black-night', 'black-translucent'],
  ] as const)('sets the %s theme to %s', (theme, expected) => {
    const meta = statusBarMeta()
    syncIosStatusBar(theme)
    expect(meta.getAttribute('content')).toBe(expected)
  })

  it('does nothing when the meta tag is absent', () => {
    expect(() => syncIosStatusBar('md3-light')).not.toThrow()
  })
})

describe('explicit theme storage', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('returns the stored theme', () => {
    localStorage.setItem('clytrade.theme', 'black-night')
    expect(readExplicitTheme()).toBe('black-night')
  })

  it('returns null when nothing is stored', () => {
    expect(readExplicitTheme()).toBeNull()
  })

  it('returns null for an unknown stored value', () => {
    localStorage.setItem('clytrade.theme', 'md3-sepia')
    expect(readExplicitTheme()).toBeNull()
  })

  it('ignores the theme applied pre-paint', () => {
    document.documentElement.dataset.theme = 'md3-light'
    expect(readExplicitTheme()).toBeNull()
  })
})

describe('theme surface colors', () => {
  it.each(Object.keys(THEME_CSS) as ThemeId[])('matches the %s stylesheet surface', (themeId) => {
    const css = readFileSync(resolve(process.cwd(), THEME_CSS[themeId]), 'utf8')
    expect(css).toContain(`--md-sys-color-surface: ${THEME_SURFACE_COLORS[themeId]};`)
  })
})
