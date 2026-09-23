import { describe, expect, it } from 'vitest'
import { calculateMarginLeverage, type MarginLeverageInput } from './marginLeverage'

const base: MarginLeverageInput = {
  accountSize: 1000,
  positionNotional: 5000,
  leverage: 10,
  maintenanceMarginPercent: 0.5,
}

describe('calculateMarginLeverage', () => {
  it('computes margin, buying power and effective leverage', () => {
    const result = calculateMarginLeverage(base)
    expect(result?.requiredMargin).toBeCloseTo(500, 10)
    expect(result?.marginPercentOfAccount).toBeCloseTo(50, 10)
    expect(result?.maxPositionNotional).toBeCloseTo(10000, 10)
    expect(result?.effectiveLeverage).toBeCloseTo(5, 10)
    expect(result?.liquidationMovePercent).toBeCloseTo(9.5, 10)
  })

  it('treats the full buying power as 100% margin usage', () => {
    const result = calculateMarginLeverage({ ...base, positionNotional: 10000 })
    expect(result?.marginPercentOfAccount).toBeCloseTo(100, 10)
    expect(result?.effectiveLeverage).toBeCloseTo(10, 10)
  })

  it.each([
    ['zero account', { ...base, accountSize: 0 }],
    ['zero notional', { ...base, positionNotional: 0 }],
    ['leverage below 1', { ...base, leverage: 0 }],
    ['negative maintenance margin', { ...base, maintenanceMarginPercent: -1 }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateMarginLeverage(input)).toBeNull()
  })
})
