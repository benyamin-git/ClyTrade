import { afterEach, describe, expect, it } from 'vitest'
import { isIos, isStandalone } from './platform'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPADOS_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

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
  clearOverride('maxTouchPoints')
  clearOverride('standalone')
  stubMatchMedia(() => false)
})

describe('isIos', () => {
  it('detects iPhones', () => {
    override('userAgent', IPHONE_UA)
    expect(isIos()).toBe(true)
  })

  it('detects iPads reporting the desktop user agent', () => {
    override('userAgent', IPADOS_DESKTOP_UA)
    override('maxTouchPoints', 5)
    expect(isIos()).toBe(true)
  })

  it('does not confuse a desktop Mac with an iPad', () => {
    override('userAgent', IPADOS_DESKTOP_UA)
    override('maxTouchPoints', 0)
    expect(isIos()).toBe(false)
  })

  it('returns false on other platforms', () => {
    override('userAgent', DESKTOP_UA)
    expect(isIos()).toBe(false)
  })
})

describe('isStandalone', () => {
  it('detects the iOS standalone flag', () => {
    override('standalone', true)
    expect(isStandalone()).toBe(true)
  })

  it('detects the standalone display mode', () => {
    stubMatchMedia((query) => query === '(display-mode: standalone)')
    expect(isStandalone()).toBe(true)
  })

  it('returns false in a browser tab', () => {
    override('standalone', false)
    stubMatchMedia(() => false)
    expect(isStandalone()).toBe(false)
  })
})
