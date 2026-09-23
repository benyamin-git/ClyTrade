import { describe, expect, it } from 'vitest'
import { calculatePositionSize, type PositionSizeInput } from './positionSize'

const base: PositionSizeInput = {
  accountSize: 1000,
  riskPercent: 1,
  entryPrice: 100,
  stopPrice: 95,
  leverage: 10,
  feePercent: 0.05,
}

function expectClose(actual: number | undefined, expected: number): void {
  expect(actual).toBeCloseTo(expected, 10)
}

describe('calculatePositionSize', () => {
  it('computes size, notional, margin and fees for a long setup', () => {
    const result = calculatePositionSize(base)
    expect(result).not.toBeNull()
    expectClose(result?.riskAmount, 10)
    expectClose(result?.stopDistance, 5)
    expectClose(result?.stopDistancePercent, 5)
    expectClose(result?.positionSize, 2)
    expectClose(result?.positionNotional, 200)
    expectClose(result?.requiredMargin, 20)
    expectClose(result?.feeEstimate, 0.2)
    expectClose(result?.marginPercentOfAccount, 2)
  })

  it('handles a short setup with the same absolute stop distance', () => {
    const result = calculatePositionSize({ ...base, stopPrice: 105 })
    expectClose(result?.stopDistance, 5)
    expectClose(result?.positionSize, 2)
  })

  it('scales size with account risk', () => {
    const result = calculatePositionSize({ ...base, riskPercent: 2 })
    expectClose(result?.riskAmount, 20)
    expectClose(result?.positionSize, 4)
  })

  it.each([
    ['zero account', { ...base, accountSize: 0 }],
    ['negative risk', { ...base, riskPercent: -1 }],
    ['zero entry', { ...base, entryPrice: 0 }],
    ['entry equals stop', { ...base, stopPrice: 100 }],
    ['leverage below 1', { ...base, leverage: 0.5 }],
    ['non-finite input', { ...base, accountSize: Number.NaN }],
  ])('returns null for %s', (_name, input) => {
    expect(calculatePositionSize(input)).toBeNull()
  })
})
