import { describe, expect, it } from 'vitest'
import { buildEquityCurve, calculateJournalStats, type JournalStatsRow } from './journalStats'

const rows: JournalStatsRow[] = [
  { netPnl: 10, rMultiple: 1, closedAt: 1_000 },
  { netPnl: -5, rMultiple: -0.5, closedAt: 2_000 },
  { netPnl: 20, rMultiple: 2, closedAt: 3_000 },
  { netPnl: 0, rMultiple: 0, closedAt: 4_000 },
  { netPnl: null, rMultiple: null, closedAt: null },
]

describe('calculateJournalStats', () => {
  it('aggregates closed trades and counts open ones', () => {
    const stats = calculateJournalStats(rows)
    expect(stats.trades).toBe(5)
    expect(stats.closed).toBe(4)
    expect(stats.open).toBe(1)
    expect(stats.wins).toBe(2)
    expect(stats.losses).toBe(1)
    expect(stats.breakEven).toBe(1)
    expect(stats.netPnl).toBeCloseTo(25, 10)
    expect(stats.grossProfit).toBeCloseTo(30, 10)
    expect(stats.grossLoss).toBeCloseTo(5, 10)
    expect(stats.winRatePercent).toBeCloseTo(50, 10)
    expect(stats.averageWin).toBeCloseTo(15, 10)
    expect(stats.averageLoss).toBeCloseTo(-5, 10)
    expect(stats.profitFactor).toBeCloseTo(6, 10)
    expect(stats.averageR).toBeCloseTo(0.625, 10)
    expect(stats.expectancyR).toBeCloseTo(0.625, 10)
    expect(stats.bestTrade).toBeCloseTo(20, 10)
    expect(stats.worstTrade).toBeCloseTo(-5, 10)
  })

  it('handles an empty journal', () => {
    const stats = calculateJournalStats([])
    expect(stats.trades).toBe(0)
    expect(stats.winRatePercent).toBeNull()
    expect(stats.profitFactor).toBeNull()
    expect(stats.averageR).toBeNull()
    expect(stats.bestTrade).toBeNull()
  })

  it('returns a null profit factor without losses', () => {
    const stats = calculateJournalStats([{ netPnl: 10, rMultiple: 1, closedAt: 1 }])
    expect(stats.profitFactor).toBeNull()
  })
})

describe('buildEquityCurve', () => {
  it('builds a cumulative curve ordered by close time', () => {
    const curve = buildEquityCurve(rows, 100)
    expect(curve).toEqual([
      { t: 1_000, equity: 110, pnl: 10 },
      { t: 2_000, equity: 105, pnl: -5 },
      { t: 3_000, equity: 125, pnl: 20 },
      { t: 4_000, equity: 125, pnl: 0 },
    ])
  })

  it('ignores open trades', () => {
    const curve = buildEquityCurve([{ netPnl: null, rMultiple: null, closedAt: null }])
    expect(curve).toEqual([])
  })
})
