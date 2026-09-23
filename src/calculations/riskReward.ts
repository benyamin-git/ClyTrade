import { isFiniteInputs } from './types'

export interface RiskRewardInput {
  entryPrice: number
  stopPrice: number
  targetPrice: number
  winRatePercent: number | null
}

export interface RiskRewardResult {
  risk: number
  reward: number
  riskRewardRatio: number
  breakEvenWinRatePercent: number
  expectancyR: number | null
  stopMovePercent: number
  targetMovePercent: number
}

/**
 * Risk/reward geometry and expectancy.
 *
 * risk                  = |entryPrice - stopPrice|
 * reward                = |targetPrice - entryPrice|
 * riskRewardRatio       = reward / risk
 * breakEvenWinRate      = 1 / (1 + riskRewardRatio) * 100
 * expectancyR           = winRate/100 * riskRewardRatio - (1 - winRate/100)
 *
 * `winRatePercent` is optional; expectancy is null without it.
 * Assumptions: absolute distances, fees excluded, single target.
 */
export function calculateRiskReward(input: RiskRewardInput): RiskRewardResult | null {
  const { entryPrice, stopPrice, targetPrice, winRatePercent } = input
  if (!isFiniteInputs([entryPrice, stopPrice, targetPrice])) return null
  if (entryPrice <= 0 || stopPrice <= 0 || targetPrice <= 0) return null
  if (entryPrice === stopPrice) return null
  if (winRatePercent !== null && (!Number.isFinite(winRatePercent) || winRatePercent < 0)) {
    return null
  }

  const risk = Math.abs(entryPrice - stopPrice)
  const reward = Math.abs(targetPrice - entryPrice)
  const riskRewardRatio = reward / risk

  return {
    risk,
    reward,
    riskRewardRatio,
    breakEvenWinRatePercent: (1 / (1 + riskRewardRatio)) * 100,
    expectancyR:
      winRatePercent === null
        ? null
        : (winRatePercent / 100) * riskRewardRatio - (1 - winRatePercent / 100),
    stopMovePercent: (risk / entryPrice) * 100,
    targetMovePercent: (reward / entryPrice) * 100,
  }
}
