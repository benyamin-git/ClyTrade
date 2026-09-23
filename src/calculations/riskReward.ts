import { isFiniteInputs } from './types'

export interface RiskRewardInput {
  entryPrice: number
  stopPrice: number
  targetPrice: number
  winRatePercent: number | null
  entryFeePercent: number
  exitFeePercent: number
  includeFees: boolean
}

export interface RiskRewardResult {
  risk: number
  reward: number
  netRisk: number
  netReward: number
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
 * netRisk               = risk + entry fee + exit fee at the stop   (when included)
 * netReward             = reward - entry fee - exit fee at the target (when included)
 * riskRewardRatio       = netReward / netRisk
 * breakEvenWinRate      = 1 / (1 + riskRewardRatio) * 100
 * expectancyR           = winRate/100 * riskRewardRatio - (1 - winRate/100)
 *
 * Fees are percentages charged on notional, so per unit they scale with the
 * price at which they are paid. `risk` and `reward` stay gross distances;
 * the ratio, break-even win rate and expectancy use the net values, which
 * equal the gross ones when `includeFees` is false.
 *
 * `winRatePercent` is optional; expectancy is null without it.
 * Assumptions: single target, fees charged on notional at entry and exit.
 */
export function calculateRiskReward(input: RiskRewardInput): RiskRewardResult | null {
  const {
    entryPrice,
    stopPrice,
    targetPrice,
    winRatePercent,
    entryFeePercent,
    exitFeePercent,
    includeFees,
  } = input
  if (!isFiniteInputs([entryPrice, stopPrice, targetPrice, entryFeePercent, exitFeePercent])) {
    return null
  }
  if (entryPrice <= 0 || stopPrice <= 0 || targetPrice <= 0) return null
  if (entryFeePercent < 0 || exitFeePercent < 0) return null
  if (entryPrice === stopPrice) return null
  if (winRatePercent !== null && (!Number.isFinite(winRatePercent) || winRatePercent < 0)) {
    return null
  }

  const risk = Math.abs(entryPrice - stopPrice)
  const reward = Math.abs(targetPrice - entryPrice)
  const entryFee = entryPrice * (entryFeePercent / 100)
  const exitFeeAtStop = stopPrice * (exitFeePercent / 100)
  const exitFeeAtTarget = targetPrice * (exitFeePercent / 100)
  const netRisk = includeFees ? risk + entryFee + exitFeeAtStop : risk
  const netReward = includeFees ? reward - entryFee - exitFeeAtTarget : reward
  if (netRisk <= 0) return null

  const riskRewardRatio = netReward / netRisk

  return {
    risk,
    reward,
    netRisk,
    netReward,
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
