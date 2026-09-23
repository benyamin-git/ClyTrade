import { isFiniteInputs } from './types'

export interface PositionSizeInput {
  accountSize: number
  riskPercent: number
  entryPrice: number
  stopPrice: number
  leverage: number
  feePercent: number | null
  feeAmount: number | null
  includeFees: boolean
}

export interface PositionSizeResult {
  riskAmount: number
  stopRiskAmount: number
  stopDistance: number
  stopDistancePercent: number
  positionSize: number
  positionNotional: number
  requiredMargin: number
  feeEstimate: number
  marginPercentOfAccount: number
}

/**
 * Position size from a fixed account risk.
 *
 * Exactly one fee mode must be provided: `feePercent` (per side, charged on
 * notional) or `feeAmount` (absolute per side).
 *
 * riskAmount     = accountSize * riskPercent / 100
 * stopDistance   = |entryPrice - stopPrice|
 * roundTripFee   = positionNotional * feePercent / 100 * 2  (percent mode)
 *                = feeAmount * 2                            (amount mode)
 *
 * With `includeFees` the position is shrunk so that the stop loss plus the
 * round-trip fee equals the risk budget:
 *
 * positionSize   = riskAmount / (stopDistance + entryPrice * feePercent/100 * 2)
 *                = (riskAmount - feeAmount * 2) / stopDistance
 *
 * Without it the risk budget covers the stop distance only. `stopRiskAmount`
 * is the loss at the stop excluding fees; `riskAmount` is the total accounted
 * risk (stop loss plus fees when included).
 */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult | null {
  const {
    accountSize,
    riskPercent,
    entryPrice,
    stopPrice,
    leverage,
    feePercent,
    feeAmount,
    includeFees,
  } = input

  const numericInputs = [accountSize, riskPercent, entryPrice, stopPrice, leverage]
  if (feePercent !== null) numericInputs.push(feePercent)
  if (feeAmount !== null) numericInputs.push(feeAmount)
  if (!isFiniteInputs(numericInputs)) return null

  if ((feePercent === null) === (feeAmount === null)) return null
  if (accountSize <= 0 || entryPrice <= 0 || stopPrice <= 0) return null
  if (leverage < 1 || riskPercent < 0) return null
  if (feePercent !== null && feePercent < 0) return null
  if (feeAmount !== null && feeAmount < 0) return null
  if (entryPrice === stopPrice) return null

  const budget = accountSize * (riskPercent / 100)
  const stopDistance = Math.abs(entryPrice - stopPrice)
  const roundTripRate = feePercent === null ? 0 : (feePercent / 100) * 2

  let positionSize: number
  if (feeAmount !== null) {
    if (includeFees) {
      const remaining = budget - feeAmount * 2
      if (remaining <= 0) return null
      positionSize = remaining / stopDistance
    } else {
      positionSize = budget / stopDistance
    }
  } else if (includeFees) {
    positionSize = budget / (stopDistance + entryPrice * roundTripRate)
  } else {
    positionSize = budget / stopDistance
  }

  const positionNotional = positionSize * entryPrice
  const requiredMargin = positionNotional / leverage
  const feeEstimate = feeAmount !== null ? feeAmount * 2 : positionNotional * roundTripRate
  const stopRiskAmount = positionSize * stopDistance

  return {
    riskAmount: includeFees ? stopRiskAmount + feeEstimate : stopRiskAmount,
    stopRiskAmount,
    stopDistance,
    stopDistancePercent: (stopDistance / entryPrice) * 100,
    positionSize,
    positionNotional,
    requiredMargin,
    feeEstimate,
    marginPercentOfAccount: (requiredMargin / accountSize) * 100,
  }
}
