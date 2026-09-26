import { describe, expect, it } from 'vitest'
import { formatDate } from './dates'
import { setIntlContext } from './intl'

describe('formatDate', () => {
  it('formats gregorian dates with persian labels and latin digits', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })
    expect(formatDate(new Date(2026, 8, 26))).toBe('26 سپتامبر 2026')
  })

  it('formats english dates', () => {
    setIntlContext({ locale: 'en-US' })
    expect(formatDate(new Date(2026, 8, 26))).toBe('Sep 26, 2026')
  })

  it('returns a placeholder for invalid dates', () => {
    expect(formatDate(new Date('nope'))).toBe('—')
  })
})
