import { isFiniteInputs } from './types'

export interface SpotFuturesInput {
  capital: number
  price: number
  leverage: number
  contractSize: number
  feePercent: number
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
 * liquidationMovePercent = 100 / leverage
 *
 * Assumptions: spot uses the full capital with no fees deducted from size;
 * futures uses the full capital as isolated margin, ignoring maintenance
 * margin (use the Liquidation Price calculator for a precise estimate).
 */
export function calculateSpotFutures(input: SpotFuturesInput): SpotFuturesResult | null {
  const { capital, price, leverage, contractSize, feePercent } = input
  if (!isFiniteInputs([capital, price, leverage, contractSize, feePercent])) return null
  if (capital <= 0 || price <= 0 || leverage < 1) return null
  if (contractSize <= 0 || feePercent < 0) return null

  const spotQuantity = capital / price
  const spotNotional = spotQuantity * price
  const futuresQuantity = (capital * leverage) / price
  const futuresNotional = futuresQuantity * price

  return {
    spotQuantity,
    spotNotional,
    spotFee: spotNotional * (feePercent / 100),
    futuresQuantity,
    futuresNotional,
    futuresFee: futuresNotional * (feePercent / 100),
    futuresContracts: futuresQuantity / contractSize,
    liquidationMovePercent: 100 / leverage,
  }
}
