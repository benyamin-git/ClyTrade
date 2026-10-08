import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatDate,
  fromDateInputValue,
  isWithinRange,
  rangeStart,
  startOfDay,
  toDateInputValue,
} from './dates'
import { setIntlContext } from './intl'

const NOW = new Date(2026, 5, 15, 14, 30, 45, 123)

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

describe('startOfDay', () => {
  it('clears the time without mutating the input', () => {
    const input = new Date(2026, 5, 15, 14, 30, 45, 123)
    const result = startOfDay(input)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
    expect(input.getHours()).toBe(14)
  })
})

describe('addDays', () => {
  it.each([
    [new Date(2026, 5, 15), 7, new Date(2026, 5, 22)],
    [new Date(2026, 5, 15), -7, new Date(2026, 5, 8)],
    [new Date(2026, 5, 15), 0, new Date(2026, 5, 15)],
    [new Date(2026, 0, 31), 1, new Date(2026, 1, 1)],
    [new Date(2026, 11, 31), 1, new Date(2027, 0, 1)],
    [new Date(2024, 1, 28), 1, new Date(2024, 1, 29)],
  ])('shifts %s by %i days', (date: Date, days: number, expected: Date) => {
    expect(addDays(date, days).getTime()).toBe(expected.getTime())
  })
})

describe('rangeStart', () => {
  it.each([
    ['7d', new Date(2026, 5, 8)],
    ['30d', new Date(2026, 4, 16)],
    ['90d', new Date(2026, 2, 17)],
    ['ytd', new Date(2026, 0, 1)],
  ] as const)('starts %s at the beginning of its first day', (range, expected) => {
    expect(rangeStart(range, NOW)?.getTime()).toBe(expected.getTime())
  })

  it('returns null for all time', () => {
    expect(rangeStart('all', NOW)).toBeNull()
  })
})

describe('isWithinRange', () => {
  it('includes the start of the range', () => {
    const start = rangeStart('7d', NOW)?.getTime() ?? 0
    expect(isWithinRange(start, '7d', NOW)).toBe(true)
  })

  it('excludes timestamps before the range', () => {
    const start = rangeStart('7d', NOW)?.getTime() ?? 0
    expect(isWithinRange(start - 1, '7d', NOW)).toBe(false)
  })

  it('accepts every timestamp for all time', () => {
    expect(isWithinRange(0, 'all', NOW)).toBe(true)
    expect(isWithinRange(NOW.getTime(), 'all', NOW)).toBe(true)
  })
})

describe('toDateInputValue', () => {
  it.each([
    [new Date(2026, 0, 5, 23, 59), '2026-01-05'],
    [new Date(2026, 11, 31), '2026-12-31'],
    [new Date(2026, 8, 9, 12), '2026-09-09'],
  ])('formats %s as yyyy-mm-dd', (date: Date, expected: string) => {
    expect(toDateInputValue(date)).toBe(expected)
  })
})

describe('fromDateInputValue', () => {
  it.each(['2026-10-08', '2026-01-01', '2026-12-31', '2024-02-29'])(
    'parses %s at local midnight',
    (value) => {
      const date = fromDateInputValue(value)
      expect(date).not.toBeNull()
      expect(date?.getHours()).toBe(0)
      expect(date && toDateInputValue(date)).toBe(value)
    },
  )

  it.each([
    '2026-02-30',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-1-1',
    '08-10-2026',
    '',
    'not a date',
  ])('rejects %s', (value) => {
    expect(fromDateInputValue(value)).toBeNull()
  })
})
