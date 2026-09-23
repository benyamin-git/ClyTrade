import { isFiniteInputs, type Direction } from './types'

export interface FeesPnlInput {
  entryPrice: number
  exitPrice: number
  size: number
  direction: Direction
  leverage: number
  entryFeePercent: number
  exitFeePercent: number
  fundingPercent: number
  accountSize: number
}

export interface FeesPnlResult {
  grossPnl: number
  entryFee: number
  exitFee: number
  fundingCost: number
  totalCosts: number
  netPnl: number
  margin: number
  roiOnMarginPercent: number
  netPnlPercentOfAccount: number
  breakEvenMovePercent: number
}

/**
 * Gross and net PnL after fees and funding.
 *
 * grossPnl       = (exitPrice - entryPrice) * size * (long ? 1 : -1)
 * entryFee       = entryPrice * size * entryFeePercent / 100
 * exitFee        = exitPrice * size * exitFeePercent / 100
 * fundingCost    = entryPrice * size * fundingPercent / 100
 * netPnl         = grossPnl - totalCosts
 * roiOnMargin    = netPnl / margin * 100, margin = entryPrice * size / leverage
 * breakEvenMove  = totalCosts / (size * entryPrice) * 100
 *
 * Assumptions: `fundingPercent` is the total funding paid (positive = cost)
 * over the holding period; fees are taker-style charged on notional.
 */
export function calculateFeesPnl(input: FeesPnlInput): FeesPnlResult | null {
  const {
    entryPrice,
    exitPrice,
    size,
    direction,
    leverage,
    entryFeePercent,
    exitFeePercent,
    fundingPercent,
    accountSize,
  } = input
  if (
    !isFiniteInputs([
      entryPrice,
      exitPrice,
      size,
      leverage,
      entryFeePercent,
      exitFeePercent,
      fundingPercent,
      accountSize,
    ])
  ) {
    return null
  }
  if (entryPrice <= 0 || exitPrice <= 0 || size <= 0 || accountSize <= 0) return null
  if (leverage < 1 || entryFeePercent < 0 || exitFeePercent < 0) return null

  const grossPnl = (exitPrice - entryPrice) * size * (direction === 'long' ? 1 : -1)
  const entryFee = entryPrice * size * (entryFeePercent / 100)
  const exitFee = exitPrice * size * (exitFeePercent / 100)
  const fundingCost = entryPrice * size * (fundingPercent / 100)
  const totalCosts = entryFee + exitFee + fundingCost
  const netPnl = grossPnl - totalCosts
  const margin = (entryPrice * size) / leverage

  return {
    grossPnl,
    entryFee,
    exitFee,
    fundingCost,
    totalCosts,
    netPnl,
    margin,
    roiOnMarginPercent: (netPnl / margin) * 100,
    netPnlPercentOfAccount: (netPnl / accountSize) * 100,
    breakEvenMovePercent: (totalCosts / (size * entryPrice)) * 100,
  }
}
