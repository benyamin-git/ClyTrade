import { describe, expect, it } from 'vitest'
import {
  buildAllocation,
  calculateAssetMetrics,
  calculatePortfolioTotals,
  type PortfolioAssetInput,
} from './portfolioMetrics'

describe('calculateAssetMetrics', () => {
  it('computes value, cost and PnL with a current price', () => {
    const metrics = calculateAssetMetrics({
      quantity: 2,
      averageCost: 100,
      currentPrice: 150,
    })
    expect(metrics?.cost).toBeCloseTo(200, 10)
    expect(metrics?.value).toBeCloseTo(300, 10)
    expect(metrics?.pnl).toBeCloseTo(100, 10)
    expect(metrics?.pnlPercent).toBeCloseTo(50, 10)
    expect(metrics?.hasCurrentPrice).toBe(true)
  })

  it('values at cost when no current price is set', () => {
    const metrics = calculateAssetMetrics({ quantity: 2, averageCost: 100, currentPrice: null })
    expect(metrics?.value).toBeCloseTo(200, 10)
    expect(metrics?.pnl).toBeCloseTo(0, 10)
    expect(metrics?.hasCurrentPrice).toBe(false)
  })

  it.each([
    ['negative quantity', { quantity: -1, averageCost: 100, currentPrice: null }],
    ['negative cost', { quantity: 1, averageCost: -100, currentPrice: null }],
    ['non-positive current price', { quantity: 1, averageCost: 100, currentPrice: 0 }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateAssetMetrics(input)).toBeNull()
  })
})

const assets: PortfolioAssetInput[] = [
  { quantity: 1, averageCost: 100, currentPrice: 200 },
  { quantity: 2, averageCost: 50, currentPrice: 25 },
  { quantity: 1, averageCost: 10, currentPrice: null },
]

describe('calculatePortfolioTotals', () => {
  it('sums cost, value and PnL', () => {
    const totals = calculatePortfolioTotals(assets)
    expect(totals.assets).toBe(3)
    expect(totals.cost).toBeCloseTo(210, 10)
    expect(totals.value).toBeCloseTo(260, 10)
    expect(totals.pnl).toBeCloseTo(50, 10)
    expect(totals.pnlPercent).toBeCloseTo((50 / 210) * 100, 10)
  })

  it('handles an empty portfolio', () => {
    const totals = calculatePortfolioTotals([])
    expect(totals.value).toBe(0)
    expect(totals.pnlPercent).toBeNull()
  })
})

describe('buildAllocation', () => {
  it('computes value shares in input order', () => {
    const slices = buildAllocation(assets)
    expect(slices).toHaveLength(3)
    expect(slices[0]?.index).toBe(0)
    expect(slices[0]?.value).toBeCloseTo(200, 10)
    expect(slices[0]?.sharePercent).toBeCloseTo((200 / 260) * 100, 10)
    expect(slices[2]?.value).toBeCloseTo(10, 10)
  })

  it('returns an empty allocation for worthless holdings', () => {
    expect(buildAllocation([{ quantity: 0, averageCost: 100, currentPrice: null }])).toEqual([])
  })
})
