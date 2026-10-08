/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACCENTS,
  DEFAULT_ACCENT,
  isAccentId,
  LEGACY_ACCENT_MIGRATIONS,
  readStoredAccent,
  writeStoredAccent,
} from './accents'

const accentsCss = readFileSync(resolve(process.cwd(), 'src/theme/accents.css'), 'utf8')
const generatorSource = readFileSync(resolve(process.cwd(), 'scripts/generate-accents.mjs'), 'utf8')

const GOLDEN_PRIMARY = {
  blue: { light: '#35639c', dark: '#7daeec' },
  teal: { light: '#127070', dark: '#69bbba' },
  green: { light: '#3c703f', dark: '#4bc957' },
  orange: { light: '#924c2b', dark: '#e29572' },
  rose: { light: '#94464e', dark: '#e58f95' },
  violet: { light: '#7638c0', dark: '#b49ce1' },
} as const

function paletteBlock(accentId: string, themeId: string): string {
  const start = accentsCss.indexOf(`[data-theme='${themeId}'][data-accent='${accentId}']`)
  expect(start).toBeGreaterThan(-1)
  const open = accentsCss.indexOf('{', start)
  const close = accentsCss.indexOf('}', open)
  return accentsCss.slice(open, close)
}

function paletteRole(accentId: string, themeId: string, role: string): string {
  const match = new RegExp(`--md-sys-color-${role}: (#[0-9a-f]{6})`).exec(
    paletteBlock(accentId, themeId),
  )
  if (!match?.[1]) throw new Error(`missing --md-sys-color-${role} for ${accentId}/${themeId}`)
  return match[1]
}

describe('accent storage', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.accent
  })

  it('ships exactly the house accents in order', () => {
    expect(ACCENTS).toEqual(['blue', 'teal', 'green', 'orange', 'rose', 'violet'])
    expect(ACCENTS[0]).toBe(DEFAULT_ACCENT)
    expect(new Set(ACCENTS).size).toBe(ACCENTS.length)
  })

  it.each([
    ['blue', true],
    ['violet', true],
    ['purple', false],
    ['lime', false],
    ['amber', false],
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

  it.each(['rainbow', 'toString', 'hasOwnProperty'])(
    'ignores the unknown stored value %s',
    (value) => {
      localStorage.setItem('clytrade.accent', value)
      expect(readStoredAccent()).toBe(DEFAULT_ACCENT)
    },
  )

  it('falls back to the default for the old theme-default value', () => {
    localStorage.setItem('clytrade.accent', 'default')
    expect(readStoredAccent()).toBe(DEFAULT_ACCENT)
  })

  it('reads the accent applied to the document when storage is empty', () => {
    document.documentElement.dataset.accent = 'rose'
    expect(readStoredAccent()).toBe('rose')
  })

  it.each([
    ['purple', 'violet'],
    ['lime', 'green'],
    ['amber', 'orange'],
  ] as const)('migrates the legacy %s accent to %s and writes it back', (legacy, migrated) => {
    localStorage.setItem('clytrade.accent', legacy)

    expect(readStoredAccent()).toBe(migrated)
    expect(localStorage.getItem('clytrade.accent')).toBe(migrated)
  })

  it('leaves the stored value untouched for unknown accents', () => {
    localStorage.setItem('clytrade.accent', 'rainbow')

    expect(readStoredAccent()).toBe(DEFAULT_ACCENT)
    expect(localStorage.getItem('clytrade.accent')).toBe('rainbow')
  })

  it('exposes the legacy migration map', () => {
    expect(LEGACY_ACCENT_MIGRATIONS).toEqual({
      purple: 'violet',
      lime: 'green',
      amber: 'orange',
    })
  })
})

describe('generated accent palettes', () => {
  it('ships one block per accent and theme', () => {
    expect(accentsCss.match(/\[data-theme='/g)).toHaveLength(ACCENTS.length * 3)
  })

  it.each(ACCENTS)('ships a full light and dark palette for %s', (id) => {
    for (const theme of ['light', 'dark']) {
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

  it.each(ACCENTS)('keeps the pure-black surfaces of oled for %s', (id) => {
    const block = paletteBlock(id, 'oled')
    expect(block).toContain('--md-sys-color-primary')
    expect(block).toContain('--md-sys-color-secondary-container')
    expect(block).toContain('--md-sys-color-tertiary-container')
    expect(block).not.toContain('--md-sys-color-surface-container')
    expect(block).not.toContain('--md-sys-color-background')
  })
})

describe('accent generator seeds', () => {
  const seedIds = [...generatorSource.matchAll(/\{ id: '([a-z]+)'/g)].map((match) => match[1])

  it('seeds exactly the house accent ids', () => {
    expect(new Set(seedIds)).toEqual(new Set(ACCENTS))
  })
})

describe('generated accent values', () => {
  it('covers every house accent', () => {
    expect(Object.keys(GOLDEN_PRIMARY).sort()).toEqual([...ACCENTS].sort())
  })

  it.each(Object.entries(GOLDEN_PRIMARY))(
    'generates the house primary tones for %s',
    (id, expected) => {
      expect(paletteRole(id, 'light', 'primary')).toBe(expected.light)
      expect(paletteRole(id, 'dark', 'primary')).toBe(expected.dark)
    },
  )
})
