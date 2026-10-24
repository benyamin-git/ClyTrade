import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { injectSplashLinks, SPLASH_SCREENS, splashLinks } from './splashScreens'

describe('splash screens', () => {
  it('covers every device in portrait and landscape', () => {
    const links = splashLinks()

    expect(links).toHaveLength(SPLASH_SCREENS.length * 2)
    expect(new Set(links.map((link) => link.media)).size).toBe(links.length)
    expect(links.some((link) => link.media.includes('orientation: portrait'))).toBe(true)
    expect(links.some((link) => link.media.includes('orientation: landscape'))).toBe(true)
  })

  it('injects the links under the Pages base path', () => {
    const html = injectSplashLinks('<html><head></head><body></body></html>', '/ClyTrade/')

    expect(html).toContain('href="/ClyTrade/splash/splash-1320x2868.png"')
    expect(html).toContain('rel="apple-touch-startup-image"')
    expect(html).not.toContain('href="//ClyTrade')
  })

  it('ships every referenced image', () => {
    for (const link of splashLinks()) {
      expect(existsSync(join(process.cwd(), 'public', link.file)), link.file).toBe(true)
    }
  })
})
