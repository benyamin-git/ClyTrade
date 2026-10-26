import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { fa } from '@/i18n/fa'
import { createTranslator } from '@/i18n/translate'
import { resetIntlContext, setIntlContext } from '@/lib/intl'
import { buildAutoCloseNote } from './autoCloseNote'

const INPUT = {
  symbol: 'BTC',
  level: 120,
  reason: 'target' as const,
  at: 1_700_000_000_000,
  price: 123.5,
}

describe('buildAutoCloseNote', () => {
  it('names the level, price and time', () => {
    setIntlContext({ locale: 'en-US' })
    const note = buildAutoCloseNote(createTranslator(en), INPUT)

    expect(note).toContain('BTC')
    expect(note).toContain('120')
    expect(note).toContain('123.5')
    expect(note).toContain('Target hit')
    expect(note).toContain('2023')
    resetIntlContext()
  })

  it('localizes the note in Persian', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })
    const note = buildAutoCloseNote(createTranslator(fa), INPUT)

    expect(note).toContain('BTC')
    expect(note).toContain('123.5')
    expect(note).toContain('تارگت')
    resetIntlContext()
  })
})
