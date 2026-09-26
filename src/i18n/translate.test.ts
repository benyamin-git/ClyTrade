import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fa } from './fa'
import { translate } from './translate'
import type { TranslationKey } from './types'

describe('translate', () => {
  it('interpolates parameters', () => {
    expect(translate(en, 'common.unitAria', { label: 'Risk' })).toBe('Risk unit')
    expect(translate(fa, 'common.unitAria', { label: 'ریسک' })).toBe('واحد ریسک')
  })

  it('selects plural forms by count', () => {
    expect(translate(en, 'journal.tradeCount', { count: 1 })).toBe('1 trade')
    expect(translate(en, 'journal.tradeCount', { count: 4 })).toBe('4 trades')
    expect(translate(fa, 'journal.tradeCount', { count: 4 })).toBe('4 معامله')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(translate(en, 'shell.sections', { other: 'x' })).toBe('{{tab}} sections')
  })

  it('falls back to the key for missing entries', () => {
    expect(translate(en, 'missing.key' as TranslationKey)).toBe('missing.key')
  })

  it('returns a stable key for every dictionary path', () => {
    expect(translate(fa, 'nav.journal')).toBe(fa.nav.journal)
    expect(translate(en, 'timeRange.7d')).toBe('7D')
  })
})
