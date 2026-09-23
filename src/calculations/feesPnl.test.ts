import { describe, expect, it } from 'vitest'
import { calculateFeesPnl, type FeesPnlInput } from './feesPnl'

const base: FeesPnlInput = {
  entryPrice: 100,
  exitPrice: 110,
  size: 1,
  direction: 'long',
  leverage: 10,
  entryFeePercent: 0.05,
  exitFeePercent: 0.05,
  fundingPercent: 0,
  accountSize: 1000,
}

describe('calculateFeesPnl', () => {
  it('computes gross and net PnL for a winning long', () => {
    const result = calculateFeesPnl(base)
    expect(result?.grossPnl).toBeCloseTo(10, 10)
    expect(result?.entryFee).toBeCloseTo(0.05, 10)
    expect(result?.exitFee).toBeCloseTo(0.055, 10)
    expect(result?.totalCosts).toBeCloseTo(0.105, 10)
    expect(result?.netPnl).toBeCloseTo(9.895, 10)
    expect(result?.margin).toBeCloseTo(10, 10)
    expect(result?.roiOnMarginPercent).toBeCloseTo(98.95, 10)
    expect(result?.netPnlPercentOfAccount).toBeCloseTo(0.9895, 10)
  })

  it('turns a losing long into a net loss including costs', () => {
    const result = calculateFeesPnl({ ...base, exitPrice: 99 })
    expect(result?.grossPnl).toBeCloseTo(-1, 10)
    expect(result?.netPnl).toBeLessThan(-1)
  })

  it('inverts PnL for a short', () => {
    const result = calculateFeesPnl({ ...base, direction: 'short' })
    expect(result?.grossPnl).toBeCloseTo(-10, 10)
  })

  it('subtracts funding from net PnL', () => {
    const result = calculateFeesPnl({ ...base, fundingPercent: 0.01 })
    expect(result?.fundingCost).toBeCloseTo(0.01, 10)
    expect(result?.netPnl).toBeCloseTo(10 - 0.05 - 0.055 - 0.01, 10)
  })

  it('computes the break-even move from total costs', () => {
    const result = calculateFeesPnl(base)
    expect(result?.breakEvenMovePercent).toBeCloseTo(0.105, 10)
  })

  it.each([
    ['zero size', { ...base, size: 0 }],
    ['zero entry', { ...base, entryPrice: 0 }],
    ['leverage below 1', { ...base, leverage: 0 }],
    ['negative fee', { ...base, entryFeePercent: -1 }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateFeesPnl(input)).toBeNull()
  })
})
