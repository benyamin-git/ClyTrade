import { describe, expect, it } from 'vitest'
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPrice,
  parseNumberInput,
} from './format'
import { setIntlContext } from './intl'

describe('parseNumberInput', () => {
  it.each([
    ['1234.5', 1234.5],
    ['1,234.5', 1234.5],
    ['1,000,000', 1000000],
    [' 42 ', 42],
    ['-1,234.5', -1234.5],
    ['+42', 42],
    ['1e3', 1000],
    ['۱۲۳۴٫۵', 1234.5],
    ['١٢٣٤٫٥', 1234.5],
    ['۱٬۲۳۴', 1234],
    ['12%', 12],
    ['۵٪', 5],
    ['', null],
    ['abc', null],
    ['12abc', null],
    ['1,2,3', null],
    ['12,34', null],
    ['1,2345', null],
    ['1,,234', null],
    ['1.2.3', null],
    ['Infinity', null],
  ])('parses %s', (raw, expected) => {
    expect(parseNumberInput(raw)).toEqual(expected)
  })
})

describe('formatNumber', () => {
  it('returns a placeholder for non-finite values', () => {
    expect(formatNumber(Number.NaN)).toBe('—')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('uses latin digits and the active locale grouping', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn' })
    expect(formatNumber(1234.5, { maximumFractionDigits: 1 })).toBe('1,234.5')
  })
})

describe('formatCurrency', () => {
  it('renders toman with its localized symbol', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn' })
    expect(formatCurrency(1234.5, 'IRT')).toBe('1,234.5 تومان')
  })

  it('keeps the currency default fraction digits', () => {
    setIntlContext({ locale: 'en-US' })
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatCurrency(1234.5, 'JPY')).toBe('¥1,235')
    expect(formatCurrency(1234.5, 'KRW')).toBe('₩1,235')
  })

  it('still lets callers override fraction digits', () => {
    setIntlContext({ locale: 'en-US' })
    expect(formatCurrency(1234.5, 'JPY', { maximumFractionDigits: 2 })).toBe('¥1,234.5')
  })

  it('returns a placeholder for non-finite values', () => {
    expect(formatCurrency(Number.NaN)).toBe('—')
  })
})

describe('formatPercent', () => {
  it.each([
    ['en-US', 12.5, 1, '12.5%'],
    ['fa-IR-u-nu-latn', 12.5, 1, '12.5%'],
    ['tr-TR-u-nu-latn', 12.5, 1, '%12,5'],
  ] as const)('formats %s with the locale percent sign', (locale, value, digits, expected) => {
    setIntlContext({ locale })
    expect(formatPercent(value, digits)).toBe(expected)
  })

  it('returns a placeholder for non-finite values', () => {
    expect(formatPercent(Number.NaN)).toBe('—')
  })
})

describe('formatCompact', () => {
  it.each([
    [1234, '1.23K'],
    [1500000, '1.5M'],
    [0, '0'],
  ])('compacts %s', (value, expected) => {
    setIntlContext({ locale: 'en-US' })
    expect(formatCompact(value)).toBe(expected)
  })

  it('returns a placeholder for non-finite values', () => {
    expect(formatCompact(Number.NEGATIVE_INFINITY)).toBe('—')
  })
})

describe('formatPrice', () => {
  it.each([
    [1234.5678, undefined, '1,234.57'],
    [12.3456789, undefined, '12.3457'],
    [0.123456789, undefined, '0.12345679'],
    [12.345, 1, '12.3'],
    [0, undefined, '0'],
  ])('formats %s with %s decimals', (value, decimals, expected) => {
    setIntlContext({ locale: 'en-US' })
    expect(formatPrice(value, decimals)).toBe(expected)
  })

  it('returns a placeholder for non-finite values', () => {
    expect(formatPrice(Number.NaN)).toBe('—')
  })
})
