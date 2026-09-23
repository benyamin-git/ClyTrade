import { describe, expect, it } from 'vitest'
import { calculateTradeMetrics, type TradeMetricsInput } from './tradeMetrics'

const base: TradeMetricsInput = {
  direction: 'long',
  entryPrice: 100,
  exitPrice: 110,
  size: 2,
  leverage: 10,
  fees: 1,
  stopPrice: 95,
  targetPrice: 115,
  openedAt: 1_000,
  closedAt: 2_000,
}

describe('calculateTradeMetrics', () => {
  it('computes net PnL, R multiple and planned R:R for a closed long', () => {
    const result = calculateTradeMetrics(base)
    expect(result?.isClosed).toBe(true)
    expect(result?.margin).toBeCloseTo(20, 10)
    expect(result?.grossPnl).toBeCloseTo(20, 10)
    expect(result?.netPnl).toBeCloseTo(19, 10)
    expect(result?.returnPercent).toBeCloseTo(95, 10)
    expect(result?.riskAmount).toBeCloseTo(10, 10)
    expect(result?.rMultiple).toBeCloseTo(1.9, 10)
    expect(result?.plannedRiskReward).toBeCloseTo(3, 10)
    expect(result?.durationMs).toBeCloseTo(1_000, 10)
  })

  it('inverts PnL for a short', () => {
    const result = calculateTradeMetrics({ ...base, direction: 'short' })
    expect(result?.grossPnl).toBeCloseTo(-20, 10)
    expect(result?.rMultiple).toBeCloseTo(-2.1, 10)
  })

  it('returns null metrics for an open trade', () => {
    const result = calculateTradeMetrics({ ...base, exitPrice: null, closedAt: null })
    expect(result?.isClosed).toBe(false)
    expect(result?.netPnl).toBeNull()
    expect(result?.rMultiple).toBeNull()
    expect(result?.returnPercent).toBeNull()
    expect(result?.durationMs).toBeNull()
  })

  it('omits R multiple without a stop', () => {
    const result = calculateTradeMetrics({ ...base, stopPrice: null })
    expect(result?.rMultiple).toBeNull()
    expect(result?.riskAmount).toBeNull()
    expect(result?.plannedRiskReward).toBeNull()
  })

  it.each([
    ['zero size', { ...base, size: 0 }],
    ['zero entry', { ...base, entryPrice: 0 }],
    ['leverage below 1', { ...base, leverage: 0 }],
    ['negative fees', { ...base, fees: -1 }],
    ['non-finite exit', { ...base, exitPrice: Number.NaN }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateTradeMetrics(input)).toBeNull()
  })
})
