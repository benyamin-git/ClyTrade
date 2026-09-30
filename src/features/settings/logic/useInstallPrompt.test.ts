import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useInstallPrompt } from './useInstallPrompt'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

function override(key: string, value: unknown): void {
  Object.defineProperty(window.navigator, key, { value, configurable: true })
}

function clearOverride(key: string): void {
  delete (window.navigator as unknown as Record<string, unknown>)[key]
}

function stubMatchMedia(matches: (query: string) => boolean): void {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: matches(query),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

afterEach(() => {
  clearOverride('userAgent')
  clearOverride('standalone')
  stubMatchMedia(() => false)
})

describe('useInstallPrompt', () => {
  it('reports the app as installed when launched standalone', () => {
    stubMatchMedia((query) => query === '(display-mode: standalone)')
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.installed).toBe(true)
  })

  it('detects iOS devices', () => {
    override('userAgent', IPHONE_UA)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isIos).toBe(true)
  })

  it('marks the app installed after the appinstalled event', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.installed).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.installed).toBe(true)
  })

  it('exposes the browser install prompt when offered', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(result.current.canInstall).toBe(true)
    await act(() => result.current.promptInstall())
    expect(prompt).toHaveBeenCalledOnce()
  })
})
