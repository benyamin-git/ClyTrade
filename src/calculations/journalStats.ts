export interface JournalStatsRow {
  netPnl: number | null
  rMultiple: number | null
  closedAt: number | null
}

export interface JournalStats {
  trades: number
  closed: number
  open: number
  wins: number
  losses: number
  breakEven: number
  netPnl: number
  grossProfit: number
  grossLoss: number
  winRatePercent: number | null
  averageWin: number | null
  averageLoss: number | null
  profitFactor: number | null
  averageR: number | null
  expectancyR: number | null
  bestTrade: number | null
  worstTrade: number | null
}

export interface EquityPoint {
  t: number
  equity: number
  pnl: number
}

/**
 * Aggregate statistics over closed journal trades.
 *
 * Only rows with a `netPnl` count toward performance statistics; open trades
 * are counted separately. `profitFactor` is gross profit over gross loss and
 * is `null` when there are no losses (undefined rather than infinite).
 * `expectancyR` is the average R across rows that have one.
 */
export function calculateJournalStats(rows: readonly JournalStatsRow[]): JournalStats {
  const closedRows = rows.filter(
    (row): row is JournalStatsRow & { netPnl: number } => row.netPnl !== null,
  )
  const pnls = closedRows.map((row) => row.netPnl)
  const rValues = closedRows
    .map((row) => row.rMultiple)
    .filter((value): value is number => value !== null)

  const wins = pnls.filter((pnl) => pnl > 0)
  const losses = pnls.filter((pnl) => pnl < 0)
  const grossProfit = wins.reduce((total, pnl) => total + pnl, 0)
  const grossLoss = Math.abs(losses.reduce((total, pnl) => total + pnl, 0))
  const netPnl = pnls.reduce((total, pnl) => total + pnl, 0)

  return {
    trades: rows.length,
    closed: closedRows.length,
    open: rows.length - closedRows.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: pnls.length - wins.length - losses.length,
    netPnl,
    grossProfit,
    grossLoss,
    winRatePercent: pnls.length === 0 ? null : (wins.length / pnls.length) * 100,
    averageWin:
      wins.length === 0 ? null : wins.reduce((total, pnl) => total + pnl, 0) / wins.length,
    averageLoss:
      losses.length === 0 ? null : losses.reduce((total, pnl) => total + pnl, 0) / losses.length,
    profitFactor: grossLoss === 0 ? null : grossProfit / grossLoss,
    averageR:
      rValues.length === 0
        ? null
        : rValues.reduce((total, value) => total + value, 0) / rValues.length,
    expectancyR:
      rValues.length === 0
        ? null
        : rValues.reduce((total, value) => total + value, 0) / rValues.length,
    bestTrade: pnls.length === 0 ? null : Math.max(...pnls),
    worstTrade: pnls.length === 0 ? null : Math.min(...pnls),
  }
}

/**
 * Cumulative net PnL ordered by close time. Rows without a close time are
 * ignored. `initialEquity` seeds the curve (default 0 = cumulative PnL).
 */
export function buildEquityCurve(
  rows: readonly JournalStatsRow[],
  initialEquity = 0,
): EquityPoint[] {
  const closed = rows
    .filter(
      (row): row is JournalStatsRow & { netPnl: number; closedAt: number } =>
        row.netPnl !== null && row.closedAt !== null,
    )
    .sort((a, b) => a.closedAt - b.closedAt)

  let equity = initialEquity
  return closed.map((row) => {
    equity += row.netPnl
    return { t: row.closedAt, equity, pnl: row.netPnl }
  })
}
