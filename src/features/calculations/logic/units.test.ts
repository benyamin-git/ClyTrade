import { describe, expect, it } from 'vitest'
import { convertUnit, toAmount, toPercent } from './units'

describe('toAmount', () => {
  it.each([
    ['1% of 1000', 1, 1000, 10],
    ['0.05% of 200', 0.05, 200, 0.1],
    ['0% of 1000', 0, 1000, 0],
    ['negative percent', -2, 500, -10],
  ])('converts %s', (_name, percent, base, expected) => {
    expect(toAmount(percent, base)).toBeCloseTo(expected, 10)
  })

  it.each([
    ['null value', null, 1000],
    ['null base', 1, null],
    ['zero base', 1, 0],
    ['negative base', 1, -100],
    ['non-finite value', Number.NaN, 1000],
  ])('returns null for %s', (_name, value, base) => {
    expect(toAmount(value, base)).toBeNull()
  })
})

describe('toPercent', () => {
  it.each([
    ['10 of 1000', 10, 1000, 1],
    ['0.1 of 200', 0.1, 200, 0.05],
    ['0 of 1000', 0, 1000, 0],
  ])('converts %s', (_name, amount, base, expected) => {
    expect(toPercent(amount, base)).toBeCloseTo(expected, 10)
  })

  it.each([
    ['null value', null, 1000],
    ['zero base', 10, 0],
    ['non-finite base', 10, Number.POSITIVE_INFINITY],
  ])('returns null for %s', (_name, value, base) => {
    expect(toPercent(value, base)).toBeNull()
  })
})

describe('convertUnit', () => {
  it('converts between percent and currency', () => {
    expect(convertUnit(2, 'percent', 'currency', 1000)).toBeCloseTo(20, 10)
    expect(convertUnit(20, 'currency', 'percent', 1000)).toBeCloseTo(2, 10)
  })

  it('returns the value unchanged for the same unit', () => {
    expect(convertUnit(2, 'percent', 'percent', null)).toBe(2)
    expect(convertUnit(null, 'currency', 'percent', 1000)).toBeNull()
  })

  it('returns null when the base cannot be used', () => {
    expect(convertUnit(2, 'percent', 'currency', null)).toBeNull()
    expect(convertUnit(20, 'currency', 'percent', 0)).toBeNull()
  })
})
