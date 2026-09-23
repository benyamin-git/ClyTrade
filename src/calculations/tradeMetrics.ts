import { isFiniteInputs, type Direction } from './types'

export interface TradeMetricsInput {
  direction: Direction
  entryPrice: number
  exitPrice: number | null
  size: number
  leverage: number
  fees: number
  stopPrice: number | null
  targetPrice: number | null
  openedAt: number
  closedAt: number | null
  includeFees: boolean
}

export interface TradeMetricsResult {
  isClosed: boolean
  margin: number
  grossPnl: number | null
  netPnl: number | null
  returnPercent: number | null
  riskAmount: number | null
  rMultiple: number | null
  plannedRiskReward: number | null
  durationMs: number | null
}

/**
 * Derived metrics for a single journal trade.
 *
 * margin            = entryPrice * size / leverage
 * grossPnl          = (exitPrice - entryPrice) * size * (long ? 1 : -1)
 * netPnl            = grossPnl - fees                     (fees are absolute)
 * returnPercent     = netPnl / margin * 100
 * riskAmount        = |entryPrice - stopPrice| * size (+ fees when included)
 * rMultiple         = netPnl / riskAmount
 * plannedRiskReward = |targetPrice - entryPrice| / |entryPrice - stopPrice|
 *
 * Assumptions: `fees` is the total absolute cost of the trade. With
 * `includeFees` the fees are added to the risk amount, so a trade that risks
 * 1 and pays 0.5 in fees has a risk of 1.5. Metrics that require an exit, a
 * stop or a target are `null` when the input is missing.
 */
export function calculateTradeMetrics(input: TradeMetricsInput): TradeMetricsResult | null {
  const {
    direction,
    entryPrice,
    exitPrice,
    size,
    leverage,
    fees,
    stopPrice,
    targetPrice,
    openedAt,
    closedAt,
    includeFees,
  } = input

  const numericInputs = [entryPrice, size, leverage, fees, openedAt]
  if (exitPrice !== null) numericInputs.push(exitPrice)
  if (stopPrice !== null) numericInputs.push(stopPrice)
  if (targetPrice !== null) numericInputs.push(targetPrice)
  if (closedAt !== null) numericInputs.push(closedAt)
  if (!isFiniteInputs(numericInputs)) return null
  if (entryPrice <= 0 || size <= 0 || leverage < 1 || fees < 0) return null
  if (exitPrice !== null && exitPrice <= 0) return null
  if (stopPrice !== null && stopPrice <= 0) return null
  if (targetPrice !== null && targetPrice <= 0) return null

  const margin = (entryPrice * size) / leverage
  const directionSign = direction === 'long' ? 1 : -1

  const grossPnl = exitPrice === null ? null : (exitPrice - entryPrice) * size * directionSign
  const netPnl = grossPnl === null ? null : grossPnl - fees
  const riskAmount =
    stopPrice === null ? null : Math.abs(entryPrice - stopPrice) * size + (includeFees ? fees : 0)
  const stopDistance = stopPrice === null ? null : Math.abs(entryPrice - stopPrice)

  return {
    isClosed: exitPrice !== null,
    margin,
    grossPnl,
    netPnl,
    returnPercent: netPnl === null || margin === 0 ? null : (netPnl / margin) * 100,
    riskAmount,
    rMultiple:
      netPnl === null || riskAmount === null || riskAmount === 0 ? null : netPnl / riskAmount,
    plannedRiskReward:
      stopDistance === null || stopDistance === 0 || targetPrice === null
        ? null
        : Math.abs(targetPrice - entryPrice) / stopDistance,
    durationMs: closedAt === null ? null : Math.max(0, closedAt - openedAt),
  }
}
