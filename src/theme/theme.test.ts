import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDarkTheme, syncIosStatusBar, syncNativeSystemBar } from './theme'

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
