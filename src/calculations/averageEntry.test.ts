import { describe, expect, it } from 'vitest'
import { calculateAverageEntry, type AverageEntryInput } from './averageEntry'

const base: AverageEntryInput = {
  existingSize: 1,
  existingEntryPrice: 100,
  addSize: 1,
  addPrice: 80,
}

describe('calculateAverageEntry', () => {
  it('blends two entries', () => {
    const result = calculateAverageEntry(base)
    expect(result?.totalSize).toBeCloseTo(2, 10)
    expect(result?.totalNotional).toBeCloseTo(180, 10)
    expect(result?.averageEntryPrice).toBeCloseTo(90, 10)
    expect(result?.priceChangePercent).toBeCloseTo(-10, 10)
  })

  it('handles a fresh entry when existing size is zero', () => {
    const result = calculateAverageEntry({ ...base, existingSize: 0 })
    expect(result?.averageEntryPrice).toBeCloseTo(80, 10)
    expect(result?.priceChangePercent).toBeCloseTo(-20, 10)
  })

  it('weights the blend by size', () => {
    const result = calculateAverageEntry({ ...base, addSize: 3 })
    expect(result?.totalSize).toBeCloseTo(4, 10)
    expect(result?.averageEntryPrice).toBeCloseTo(85, 10)
  })

  it.each([
    ['negative existing size', { ...base, existingSize: -1 }],
    ['zero add size', { ...base, addSize: 0 }],
    ['zero add price', { ...base, addPrice: 0 }],
    ['zero existing price', { ...base, existingEntryPrice: 0 }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateAverageEntry(input)).toBeNull()
  })
})
