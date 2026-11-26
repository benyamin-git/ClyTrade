import { describe, expect, it } from 'vitest'
import { calculatePosition, type PositionCalculatorInput } from './positionCalculator'

const base: PositionCalculatorInput = {
  risk: 100,
  entryPrice: 100,
  targetPrice: 115,
  stopPrice: 95,
  feePercent: 0.1,
  leverage: 10,
  maintenanceMarginPercent: 0.5,
  winRatePercent: 50,
}

describe('calculatePosition', () => {
  it('computes every long result with fees split per side', () => {
    const result = calculatePosition(base)

    expect(result?.direction).toBe('long')
    expect(result?.unitSize).toBeCloseTo(19.249278, 6)
    expect(result?.notional).toBeCloseTo(1924.927815, 6)
    expect(result?.requiredMargin).toBeCloseTo(192.492782, 6)
    expect(result?.stopDistance).toBe(5)
    expect(result?.stopDistancePercent).toBe(5)
    expect(result?.targetDistance).toBe(15)
    expect(result?.targetDistancePercent).toBe(15)
    expect(result?.rr).toBeCloseTo(2.8460058, 6)
    expect(result?.pnl).toBeCloseTo(284.600577, 6)
    expect(result?.liquidationDistance).toBeCloseTo(9.5, 10)
    expect(result?.liquidationDistancePercent).toBe(9.5)
    expect(result?.liquidationPrice).toBe(90.5)
    expect(result?.breakEvenWinRatePercent).toBeCloseTo(26.001, 3)
    expect(result?.expectancyR).toBeCloseTo(0.923003, 6)
  })

  it('mirrors the maths for a short without fees', () => {
    const result = calculatePosition({
      risk: 50,
      entryPrice: 100,
      targetPrice: 90,
      stopPrice: 105,
      feePercent: 0,
      leverage: 5,
      maintenanceMarginPercent: 1,
      winRatePercent: 40,
    })

    expect(result?.direction).toBe('short')
    expect(result?.unitSize).toBe(10)
    expect(result?.notional).toBe(1000)
    expect(result?.requiredMargin).toBe(200)
    expect(result?.rr).toBe(2)
    expect(result?.pnl).toBe(100)
    expect(result?.liquidationDistance).toBe(19)
    expect(result?.liquidationDistancePercent).toBe(19)
    expect(result?.liquidationPrice).toBe(119)
    expect(result?.breakEvenWinRatePercent).toBeCloseTo(33.3333, 4)
    expect(result?.expectancyR).toBeCloseTo(0.2, 10)
  })

  it('returns only the results the available inputs support', () => {
    const result = calculatePosition({
      risk: 100,
      entryPrice: 100,
      targetPrice: null,
      stopPrice: 95,
      feePercent: 0.1,
      leverage: null,
      maintenanceMarginPercent: null,
      winRatePercent: null,
    })

    expect(result?.direction).toBe('long')
    expect(result?.unitSize).toBeCloseTo(19.249278, 6)
    expect(result?.notional).toBeCloseTo(1924.927815, 6)
    expect(result?.stopDistance).toBe(5)
    expect(result?.requiredMargin).toBeNull()
    expect(result?.rr).toBeNull()
    expect(result?.pnl).toBeNull()
    expect(result?.liquidationDistance).toBeNull()
    expect(result?.liquidationDistancePercent).toBeNull()
    expect(result?.liquidationPrice).toBeNull()
    expect(result?.breakEvenWinRatePercent).toBeNull()
    expect(result?.expectancyR).toBeNull()
  })

  it('infers direction from the target when there is no stop', () => {
    const result = calculatePosition({
      risk: null,
      entryPrice: 100,
      targetPrice: 120,
      stopPrice: null,
      feePercent: null,
      leverage: 10,
      maintenanceMarginPercent: 0.5,
      winRatePercent: null,
    })

    expect(result?.direction).toBe('long')
    expect(result?.targetDistance).toBe(20)
    expect(result?.targetDistancePercent).toBe(20)
    expect(result?.liquidationDistance).toBeCloseTo(9.5, 10)
    expect(result?.liquidationDistancePercent).toBe(9.5)
    expect(result?.liquidationPrice).toBe(90.5)
    expect(result?.unitSize).toBeNull()
  })

  it('allows a zero long liquidation price at one-times leverage', () => {
    const result = calculatePosition({
      ...base,
      leverage: 1,
      maintenanceMarginPercent: 0,
    })

    expect(result?.liquidationDistance).toBe(100)
    expect(result?.liquidationDistancePercent).toBe(100)
    expect(result?.liquidationPrice).toBe(0)
  })

  it('ignores a target on the wrong side of the entry', () => {
    const result = calculatePosition({ ...base, targetPrice: 90 })

    expect(result?.rr).toBeNull()
    expect(result?.pnl).toBeNull()
    expect(result?.stopDistance).toBe(5)
  })

  it('treats a zero risk budget as no position size', () => {
    const result = calculatePosition({ ...base, risk: 0 })

    expect(result?.unitSize).toBeNull()
    expect(result?.notional).toBeNull()
    expect(result?.rr).toBeCloseTo(2.8460058, 6)
  })

  it.each([
    [45, 2, 2.1875],
    [50, 2, 3.125],
    [60, 2, 5],
    [40, 3, 2.5],
    [55, 1.5, 3.125],
    [50, 1, 0],
    [45, 2.5, 2.875],
  ])('recommends %s%% risk at a %s%% win rate and %sR', (winRate, rr, expected) => {
    const result = calculatePosition({
      risk: 100,
      entryPrice: 100,
      stopPrice: 95,
      targetPrice: 100 + rr * 5,
      feePercent: 0,
      leverage: null,
      maintenanceMarginPercent: null,
      winRatePercent: winRate,
    })

    expect(result?.recommendedRiskPercent).toBeCloseTo(expected, 2)
  })

  it('leaves the recommended risk empty without a win rate or target', () => {
    expect(calculatePosition({ ...base, winRatePercent: null })?.recommendedRiskPercent).toBeNull()
    expect(calculatePosition({ ...base, targetPrice: null })?.recommendedRiskPercent).toBeNull()
  })

  it.each([
    ['no entry', { ...base, entryPrice: null }],
    ['zero entry', { ...base, entryPrice: 0 }],
    ['negative stop', { ...base, stopPrice: -1 }],
    ['negative fee', { ...base, feePercent: -0.1 }],
    ['leverage below one', { ...base, leverage: 0.5 }],
    ['negative maintenance margin', { ...base, maintenanceMarginPercent: -1 }],
    ['win rate above 100', { ...base, winRatePercent: 101 }],
  ])('returns null for %s', (_label, input) => {
    expect(calculatePosition(input)).toBeNull()
  })
})
