import { describe, expect, it } from 'vitest'
import { calculateRiskReward, type RiskRewardInput } from './riskReward'

const base: RiskRewardInput = {
  entryPrice: 100,
  stopPrice: 95,
  targetPrice: 115,
  winRatePercent: null,
  entryFeePercent: 0,
  exitFeePercent: 0,
  includeFees: false,
}

describe('calculateRiskReward', () => {
  it('computes a 3R setup', () => {
    const result = calculateRiskReward(base)
    expect(result?.risk).toBeCloseTo(5, 10)
    expect(result?.reward).toBeCloseTo(15, 10)
    expect(result?.netRisk).toBeCloseTo(5, 10)
    expect(result?.netReward).toBeCloseTo(15, 10)
    expect(result?.riskRewardRatio).toBeCloseTo(3, 10)
    expect(result?.breakEvenWinRatePercent).toBeCloseTo(25, 10)
    expect(result?.stopMovePercent).toBeCloseTo(5, 10)
    expect(result?.targetMovePercent).toBeCloseTo(15, 10)
    expect(result?.expectancyR).toBeNull()
  })

  it('computes expectancy from a win rate', () => {
    const result = calculateRiskReward({ ...base, winRatePercent: 50 })
    expect(result?.expectancyR).toBeCloseTo(1, 10)
  })

  it('nets fees out of the risk, reward and ratio when fees are included', () => {
    const result = calculateRiskReward({
      ...base,
      entryFeePercent: 0.1,
      exitFeePercent: 0.1,
      includeFees: true,
    })
    expect(result?.risk).toBeCloseTo(5, 10)
    expect(result?.reward).toBeCloseTo(15, 10)
    expect(result?.netRisk).toBeCloseTo(5.195, 10)
    expect(result?.netReward).toBeCloseTo(14.785, 10)
    expect(result?.riskRewardRatio).toBeCloseTo(2.8460057748, 9)
    expect(result?.breakEvenWinRatePercent).toBeCloseTo(26.001001001, 9)
  })

  it('computes expectancy on the net ratio', () => {
    const result = calculateRiskReward({
      ...base,
      winRatePercent: 50,
      entryFeePercent: 0.1,
      exitFeePercent: 0.1,
      includeFees: true,
    })
    expect(result?.expectancyR).toBeCloseTo(0.9230028874, 9)
  })

  it('ignores fees when they are excluded', () => {
    const result = calculateRiskReward({ ...base, entryFeePercent: 0.1, exitFeePercent: 0.1 })
    expect(result?.netRisk).toBeCloseTo(5, 10)
    expect(result?.netReward).toBeCloseTo(15, 10)
    expect(result?.riskRewardRatio).toBeCloseTo(3, 10)
  })

  it('handles a target at entry as a zero-reward trade', () => {
    const result = calculateRiskReward({ ...base, targetPrice: 100 })
    expect(result?.riskRewardRatio).toBe(0)
    expect(result?.breakEvenWinRatePercent).toBeCloseTo(100, 10)
  })

  it.each([
    ['zero entry', { ...base, entryPrice: 0 }],
    ['entry equals stop', { ...base, stopPrice: 100 }],
    ['negative win rate', { ...base, winRatePercent: -5 }],
    ['negative entry fee', { ...base, entryFeePercent: -0.1 }],
    ['negative exit fee', { ...base, exitFeePercent: -0.1 }],
    ['non-finite entry fee', { ...base, entryFeePercent: Number.NaN }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateRiskReward(input)).toBeNull()
  })
})
