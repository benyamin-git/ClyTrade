import { isFiniteInputs } from './types'

export interface PositionSizeInput {
  accountSize: number
  riskPercent: number
  entryPrice: number
  stopPrice: number
  leverage: number
  feePercent: number
}

export interface PositionSizeResult {
  riskAmount: number
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
 * riskAmount        = accountSize * riskPercent / 100
 * stopDistance      = |entryPrice - stopPrice|
 * positionSize      = riskAmount / stopDistance
 * positionNotional  = positionSize * entryPrice
 * requiredMargin    = positionNotional / leverage
 * feeEstimate       = positionNotional * feePercent / 100 * 2   (round trip)
 *
 * Assumptions: fees are charged on notional at entry and exit; the risk
 * amount ignores fees (use the Fees & PnL calculator to inspect costs).
 */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult | null {
  const { accountSize, riskPercent, entryPrice, stopPrice, leverage, feePercent } = input
  if (!isFiniteInputs([accountSize, riskPercent, entryPrice, stopPrice, leverage, feePercent])) {
    return null
  }
  if (accountSize <= 0 || entryPrice <= 0 || stopPrice <= 0) return null
  if (leverage < 1 || riskPercent < 0 || feePercent < 0) return null
  if (entryPrice === stopPrice) return null

  const riskAmount = accountSize * (riskPercent / 100)
  const stopDistance = Math.abs(entryPrice - stopPrice)
  const positionSize = riskAmount / stopDistance
  const positionNotional = positionSize * entryPrice
  const requiredMargin = positionNotional / leverage
  const feeEstimate = positionNotional * (feePercent / 100) * 2

  return {
    riskAmount,
    stopDistance,
    stopDistancePercent: (stopDistance / entryPrice) * 100,
    positionSize,
    positionNotional,
    requiredMargin,
    feeEstimate,
    marginPercentOfAccount: (requiredMargin / accountSize) * 100,
  }
}
