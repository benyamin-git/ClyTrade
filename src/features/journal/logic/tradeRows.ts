import { calculateTradeMetrics, type TradeMetricsResult } from '@/calculations/tradeMetrics'
import type { Trade } from '@/data/models/trade'

export interface TradeRow {
  trade: Trade
  metrics: TradeMetricsResult | null
}

export function toTradeRows(trades: readonly Trade[]): TradeRow[] {
  return trades.map((trade) => ({
    trade,
    metrics: calculateTradeMetrics({
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      size: trade.size,
      leverage: trade.leverage,
      fees: trade.fees,
      stopPrice: trade.stopPrice,
      targetPrice: trade.targetPrice,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
    }),
  }))
}
