import { describe, expect, it } from 'vitest'
import { formatCurrency, formatNumber, parseNumberInput } from './format'
import { setIntlContext } from './intl'

describe('parseNumberInput', () => {
  it.each([
    ['1234.5', 1234.5],
    ['1,234.5', 1234.5],
    [' 42 ', 42],
    ['۱۲۳۴٫۵', 1234.5],
    ['١٢٣٤٫٥', 1234.5],
    ['۱٬۲۳۴', 1234],
    ['12%', 12],
    ['۵٪', 5],
    ['', null],
    ['abc', null],
    ['12abc', null],
  ])('parses %s', (raw, expected) => {
    expect(parseNumberInput(raw)).toEqual(expected)
  })
})

describe('format with the active locale', () => {
  it('uses latin digits for persian', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn' })
    expect(formatNumber(1234.5, { maximumFractionDigits: 1 })).toBe('1,234.5')
  })

  it('renders toman with its localized symbol', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn' })
    expect(formatCurrency(1234.5, 'IRT')).toBe('1,234.5 تومان')
  })

  it('still formats iso currencies through Intl', () => {
    setIntlContext({ locale: 'en-US' })
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50')
  })
})
