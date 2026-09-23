import { isFiniteInputs } from './types'

export interface MarginLeverageInput {
  accountSize: number
  positionNotional: number
  leverage: number
  maintenanceMarginPercent: number
}

export interface MarginLeverageResult {
  requiredMargin: number
  marginPercentOfAccount: number
  maxPositionNotional: number
  effectiveLeverage: number
  liquidationMovePercent: number
}

/**
 * Margin, buying power and effective leverage.
 *
 * requiredMargin          = positionNotional / leverage
 * maxPositionNotional     = accountSize * leverage
 * effectiveLeverage       = positionNotional / accountSize
 * liquidationMovePercent  = 100 / leverage - maintenanceMarginPercent
 *
 * Assumptions: isolated margin, no unrealized PnL, no funding. The
 * liquidation move is the adverse price move that consumes the initial
 * margin minus the maintenance margin buffer.
 */
export function calculateMarginLeverage(input: MarginLeverageInput): MarginLeverageResult | null {
  const { accountSize, positionNotional, leverage, maintenanceMarginPercent } = input
  if (!isFiniteInputs([accountSize, positionNotional, leverage, maintenanceMarginPercent])) {
    return null
  }
  if (accountSize <= 0 || positionNotional <= 0) return null
  if (leverage < 1 || maintenanceMarginPercent < 0) return null

  const requiredMargin = positionNotional / leverage
  return {
    requiredMargin,
    marginPercentOfAccount: (requiredMargin / accountSize) * 100,
    maxPositionNotional: accountSize * leverage,
    effectiveLeverage: positionNotional / accountSize,
    liquidationMovePercent: 100 / leverage - maintenanceMarginPercent,
  }
}
