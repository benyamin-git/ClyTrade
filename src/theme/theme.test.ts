import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDarkTheme, syncNativeSystemBar } from './theme'

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
