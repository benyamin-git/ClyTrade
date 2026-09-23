import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.accent
  })

  it('applies the default accent instead of clearing it', () => {
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.accent).toBe('blue')
  })

  it('clears the attribute for the theme-native accent', () => {
    localStorage.setItem('clytrade.accent', 'purple')
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.accent).toBeUndefined()
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
