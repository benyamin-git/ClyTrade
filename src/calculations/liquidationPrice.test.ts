import { describe, expect, it } from 'vitest'
import { calculateLiquidationPrice, type LiquidationPriceInput } from './liquidationPrice'

const base: LiquidationPriceInput = {
  entryPrice: 100,
  leverage: 10,
  direction: 'long',
  maintenanceMarginPercent: 0.5,
}

describe('calculateLiquidationPrice', () => {
  it('estimates a long liquidation below entry', () => {
    const result = calculateLiquidationPrice(base)
    expect(result?.liquidationPrice).toBeCloseTo(90.5, 10)
    expect(result?.distanceAbsolute).toBeCloseTo(9.5, 10)
    expect(result?.distancePercent).toBeCloseTo(9.5, 10)
  })

  it('estimates a short liquidation above entry', () => {
    const result = calculateLiquidationPrice({ ...base, direction: 'short' })
    expect(result?.liquidationPrice).toBeCloseTo(109.5, 10)
    expect(result?.distancePercent).toBeCloseTo(9.5, 10)
  })

  it('moves closer to entry as leverage grows', () => {
    const result = calculateLiquidationPrice({ ...base, leverage: 50 })
    expect(result?.liquidationPrice).toBeCloseTo(98.5, 10)
  })

  it.each([
    ['zero entry', { ...base, entryPrice: 0 }],
    ['leverage below 1', { ...base, leverage: 0.5 }],
    ['maintenance margin above the buffer', { ...base, maintenanceMarginPercent: 200 }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateLiquidationPrice(input)).toBeNull()
  })
})
