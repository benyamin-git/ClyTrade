import { isFiniteInputs } from './types'

export interface SpotFuturesInput {
  capital: number
  price: number
  leverage: number
  contractSize: number
  feePercent: number | null
  feeAmount: number | null
}

export interface SpotFuturesResult {
  spotQuantity: number
  spotNotional: number
  spotFee: number
  futuresQuantity: number
  futuresNotional: number
  futuresFee: number
  futuresContracts: number
  liquidationMovePercent: number
}

/**
 * Spot vs futures sizing for the same capital.
 *
 * spotQuantity          = capital / price
 * futuresQuantity       = capital * leverage / price
 * futuresContracts      = futuresQuantity / contractSize
 * fee                   = notional * feePercent / 100
 *                       = feeAmount                       (absolute per side)
 * liquidationMovePercent = 100 / leverage
 *
 * Assumptions: spot uses the full capital with no fees deducted from size;
 * futures uses the full capital as isolated margin, ignoring maintenance
 * margin (use the Liquidation Price calculator for a precise estimate).
 * Exactly one fee mode must be provided; the absolute amount is charged per
 * side, so both the spot and futures legs report the same fee.
 */
export function calculateSpotFutures(input: SpotFuturesInput): SpotFuturesResult | null {
  const { capital, price, leverage, contractSize, feePercent, feeAmount } = input
  const numericInputs = [capital, price, leverage, contractSize]
  if (feePercent !== null) numericInputs.push(feePercent)
  if (feeAmount !== null) numericInputs.push(feeAmount)
  if (!isFiniteInputs(numericInputs)) return null
  if ((feePercent === null) === (feeAmount === null)) return null
  if (capital <= 0 || price <= 0 || leverage < 1) return null
  if (contractSize <= 0) return null
  if (feePercent !== null && feePercent < 0) return null
  if (feeAmount !== null && feeAmount < 0) return null

  const spotQuantity = capital / price
  const spotNotional = spotQuantity * price
  const futuresQuantity = (capital * leverage) / price
  const futuresNotional = futuresQuantity * price
  const rate = feePercent === null ? 0 : feePercent / 100

  return {
    spotQuantity,
    spotNotional,
    spotFee: feeAmount !== null ? feeAmount : spotNotional * rate,
    futuresQuantity,
    futuresNotional,
    futuresFee: feeAmount !== null ? feeAmount : futuresNotional * rate,
    futuresContracts: futuresQuantity / contractSize,
    liquidationMovePercent: 100 / leverage,
  }
}
