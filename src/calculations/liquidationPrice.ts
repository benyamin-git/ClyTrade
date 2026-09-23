import { isFiniteInputs, type Direction } from './types'

export interface LiquidationPriceInput {
  entryPrice: number
  leverage: number
  direction: Direction
  maintenanceMarginPercent: number
}

export interface LiquidationPriceResult {
  liquidationPrice: number
  distanceAbsolute: number
  distancePercent: number
}

/**
 * Estimated isolated-margin liquidation price.
 *
 * long:  entryPrice * (1 - 1 / leverage + maintenanceMarginPercent / 100)
 * short: entryPrice * (1 + 1 / leverage - maintenanceMarginPercent / 100)
 *
 * Assumptions: isolated margin with the full position margin posted, no
 * funding, no added collateral. Exchange formulas differ slightly; this is
 * a planning estimate, not an exchange quote.
 *
 * Returns `null` when the maintenance margin consumes the whole initial
 * margin buffer (the position would be liquidated at entry).
 */
export function calculateLiquidationPrice(
  input: LiquidationPriceInput,
): LiquidationPriceResult | null {
  const { entryPrice, leverage, direction, maintenanceMarginPercent } = input
  if (!isFiniteInputs([entryPrice, leverage, maintenanceMarginPercent])) return null
  if (entryPrice <= 0 || leverage < 1 || maintenanceMarginPercent < 0) return null

  const buffer = 1 / leverage - maintenanceMarginPercent / 100
  if (buffer <= 0) return null
  const liquidationPrice =
    direction === 'long' ? entryPrice * (1 - buffer) : entryPrice * (1 + buffer)
  if (!Number.isFinite(liquidationPrice) || liquidationPrice <= 0) return null

  const distanceAbsolute = Math.abs(entryPrice - liquidationPrice)
  return {
    liquidationPrice,
    distanceAbsolute,
    distancePercent: (distanceAbsolute / entryPrice) * 100,
  }
}
