/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACCENTS,
  DEFAULT_ACCENT,
  isAccentId,
  readStoredAccent,
  THEME_NATIVE_ACCENT,
  writeStoredAccent,
} from './accents'

const accentsCss = readFileSync(resolve(process.cwd(), 'src/theme/accents.css'), 'utf8')

const PRESET_ACCENTS = ACCENTS.filter((accent) => accent !== THEME_NATIVE_ACCENT)

function paletteBlock(accentId: string, themeId: string): string {
  const start = accentsCss.indexOf(`[data-theme='${themeId}'][data-accent='${accentId}']`)
  expect(start).toBeGreaterThan(-1)
  const open = accentsCss.indexOf('{', start)
  const close = accentsCss.indexOf('}', open)
  return accentsCss.slice(open, close)
}

describe('accent storage', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.accent
  })

  it('exposes unique accent ids including the default', () => {
    const ids = [...ACCENTS]
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(DEFAULT_ACCENT)
  })

  it('lists the default accent first', () => {
    expect(ACCENTS[0]).toBe(DEFAULT_ACCENT)
  })

  it.each([
    ['purple', true],
    ['teal', true],
    ['violet', true],
    ['default', false],
    ['rainbow', false],
    ['', false],
    [null, false],
    [42, false],
  ])('validates %s as %s', (value, expected) => {
    expect(isAccentId(value)).toBe(expected)
  })

  it('round-trips a stored accent', () => {
    writeStoredAccent('blue')
    expect(readStoredAccent()).toBe('blue')
  })

  it('falls back to the default when nothing is stored', () => {
    expect(readStoredAccent()).toBe(DEFAULT_ACCENT)
  })

  it('ignores an unknown stored value', () => {
    localStorage.setItem('clytrade.accent', 'rainbow')
    expect(readStoredAccent()).toBe(DEFAULT_ACCENT)
  })

  it('migrates the old theme-default value to the new default', () => {
    localStorage.setItem('clytrade.accent', 'default')
    expect(readStoredAccent()).toBe(DEFAULT_ACCENT)
  })

  it('reads the accent applied to the document when storage is empty', () => {
    document.documentElement.dataset.accent = 'rose'
    expect(readStoredAccent()).toBe('rose')
  })
})

describe('generated accent palettes', () => {
  it.each(PRESET_ACCENTS)('ships a full light and dark palette for %s', (id) => {
    for (const theme of ['md3-light', 'md3-dark']) {
      const block = paletteBlock(id, theme)
      for (const role of [
        '--md-sys-color-primary',
        '--md-sys-color-secondary-container',
        '--md-sys-color-tertiary-container',
        '--md-sys-color-surface-container-lowest',
      ]) {
        expect(block).toContain(role)
      }
    }
  })

  it.each(PRESET_ACCENTS)('keeps the pure-black surfaces of black-night for %s', (id) => {
    const block = paletteBlock(id, 'black-night')
    expect(block).toContain('--md-sys-color-primary')
    expect(block).toContain('--md-sys-color-secondary-container')
    expect(block).toContain('--md-sys-color-tertiary-container')
    expect(block).not.toContain('--md-sys-color-surface-container')
    expect(block).not.toContain('--md-sys-color-background')
  })
})
