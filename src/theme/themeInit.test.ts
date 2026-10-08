import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInThisContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCENTS, DEFAULT_ACCENT } from './accents'
import { DEFAULT_LIGHT_THEME, THEME_SURFACE_COLORS } from './theme'
import { injectThemeInit, THEME_INIT_PLACEHOLDER } from './themeInit'

const rawHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const injectedHtml = injectThemeInit(rawHtml)
const originalMatchMedia = window.matchMedia

function prepaintScript(): string {
  const match = /<script>([\s\S]*?)<\/script>/.exec(injectedHtml)
  if (!match?.[1]) throw new Error('index.html pre-paint script not found')
  return match[1]
}

function addMeta(name: string, content: string): HTMLMetaElement {
  const meta = document.createElement('meta')
  meta.setAttribute('name', name)
  meta.setAttribute('content', content)
  document.head.appendChild(meta)
  return meta
}

function stubMatchMedia(light: boolean): void {
  window.matchMedia = vi.fn(() => ({
    matches: light,
    media: '(prefers-color-scheme: light)',
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('theme init injection', () => {
  it('replaces the placeholder with the shared accent and theme data', () => {
    expect(rawHtml).toContain(THEME_INIT_PLACEHOLDER)
    expect(injectedHtml).not.toContain(THEME_INIT_PLACEHOLDER)
    expect(injectedHtml).toContain(JSON.stringify(ACCENTS))
    for (const surface of Object.values(THEME_SURFACE_COLORS)) {
      expect(injectedHtml).toContain(surface)
    }
  })
})

describe('pre-paint script', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.accent
    document.head.innerHTML = ''
    stubMatchMedia(false)
  })

  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.accent
    delete window.ClyTradeNative
    document.head.innerHTML = ''
    window.matchMedia = originalMatchMedia
  })

  it('resolves the system scheme and syncs the theme-color meta', () => {
    stubMatchMedia(true)
    const themeColor = addMeta('theme-color', '#1c1b1f')
    const statusBar = addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent')

    runInThisContext(prepaintScript())

    expect(document.documentElement.dataset.theme).toBe(DEFAULT_LIGHT_THEME)
    expect(document.documentElement.dataset.accent).toBe(DEFAULT_ACCENT)
    expect(themeColor.getAttribute('content')).toBe(THEME_SURFACE_COLORS[DEFAULT_LIGHT_THEME])
    expect(statusBar.getAttribute('content')).toBe('default')
  })

  it('applies a stored theme and preset accent before paint', () => {
    localStorage.setItem('clytrade.theme', 'black-night')
    localStorage.setItem('clytrade.accent', 'rose')
    const themeColor = addMeta('theme-color', '#1c1b1f')
    const statusBar = addMeta('apple-mobile-web-app-status-bar-style', 'default')

    runInThisContext(prepaintScript())

    expect(document.documentElement.dataset.theme).toBe('oled')
    expect(document.documentElement.dataset.accent).toBe('rose')
    expect(themeColor.getAttribute('content')).toBe(THEME_SURFACE_COLORS['oled'])
    expect(statusBar.getAttribute('content')).toBe('black-translucent')
  })

  it.each([
    ['purple', 'violet'],
    ['lime', 'green'],
    ['amber', 'orange'],
  ] as const)('migrates the legacy %s accent before paint', (legacy, migrated) => {
    localStorage.setItem('clytrade.accent', legacy)

    runInThisContext(prepaintScript())

    expect(document.documentElement.dataset.accent).toBe(migrated)
  })

  it('falls back to the default accent for an unknown stored value', () => {
    localStorage.setItem('clytrade.accent', 'rainbow')

    runInThisContext(prepaintScript())

    expect(document.documentElement.dataset.accent).toBe(DEFAULT_ACCENT)
  })

  it('falls back to the system theme for an unknown stored value', () => {
    localStorage.setItem('clytrade.theme', 'sepia')
    stubMatchMedia(false)

    runInThisContext(prepaintScript())

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('reports the resolved darkness to the native bridge', () => {
    localStorage.setItem('clytrade.theme', 'oled')
    const setDarkTheme = vi.fn()
    window.ClyTradeNative = { setDarkTheme }

    runInThisContext(prepaintScript())

    expect(setDarkTheme).toHaveBeenCalledWith(true)
  })
})
