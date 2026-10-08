import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from './ThemeContext'
import { ThemeProvider } from './ThemeProvider'

const originalMatchMedia = window.matchMedia

function stubSystemScheme(initialLight: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const media = {
    matches: initialLight,
    media: '(prefers-color-scheme: light)',
    onchange: null,
    addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
      listeners.add(listener)
    },
    removeEventListener(_type: string, listener: (event: MediaQueryListEvent) => void) {
      listeners.delete(listener)
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }
  window.matchMedia = vi.fn(() => media) as unknown as typeof window.matchMedia
  return (light: boolean) => {
    media.matches = light
    for (const listener of listeners) listener({ matches: light } as MediaQueryListEvent)
  }
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.accent
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('applies the default accent instead of clearing it', () => {
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.accent).toBe('blue')
  })

  it('migrates a legacy stored accent and writes it back', () => {
    localStorage.setItem('clytrade.accent', 'purple')
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.accent).toBe('violet')
    expect(localStorage.getItem('clytrade.accent')).toBe('violet')
  })

  it('applies a stored preset accent', () => {
    localStorage.setItem('clytrade.accent', 'rose')
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.accent).toBe('rose')
  })
})

describe('ThemeProvider system color scheme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.accent
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('follows the system scheme when no theme was chosen', () => {
    const setSystemLight = stubSystemScheme(true)
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => setSystemLight(false))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('does not persist the system-resolved theme', () => {
    stubSystemScheme(true)
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(localStorage.getItem('clytrade.theme')).toBeNull()
  })

  it('keeps a stored theme regardless of system changes', () => {
    localStorage.setItem('clytrade.theme', 'light')
    const setSystemLight = stubSystemScheme(false)
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => setSystemLight(false))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('stops following the system after an explicit choice', () => {
    const setSystemLight = stubSystemScheme(false)

    function PickLightTheme() {
      const { setTheme } = useTheme()
      return (
        <button type="button" onClick={() => setTheme('light')}>
          light
        </button>
      )
    }

    render(
      <ThemeProvider>
        <PickLightTheme />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: 'light' }))
    expect(localStorage.getItem('clytrade.theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => setSystemLight(false))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
