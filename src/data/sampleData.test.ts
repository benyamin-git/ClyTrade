import { beforeEach, describe, expect, it } from 'vitest'
import { assetSchema } from './models/asset'
import { tradeSchema } from './models/trade'
import { clearAssets, listAssets } from './repositories/assets.repo'
import { clearTrades, listTrades } from './repositories/trades.repo'
import { buildSampleData, loadSampleData } from './sampleData'

const NOW = Date.UTC(2026, 8, 23, 12)
const DAY = 86_400_000

describe('buildSampleData', () => {
  const { trades, assets } = buildSampleData(NOW)

  it('produces records that pass their schemas', () => {
    for (const trade of trades) {
      expect(tradeSchema.safeParse(trade).success).toBe(true)
    }
    for (const asset of assets) {
      expect(assetSchema.safeParse(asset).success).toBe(true)
    }
  })

  it('uses unique sample ids', () => {
    const ids = [...trades.map((trade) => trade.id), ...assets.map((asset) => asset.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps status consistent with exit and close timestamps', () => {
    for (const trade of trades) {
      if (trade.status === 'open') {
        expect(trade.exitPrice).toBeNull()
        expect(trade.closedAt).toBeNull()
      } else {
        expect(trade.exitPrice).not.toBeNull()
        expect(trade.closedAt).not.toBeNull()
      }
    }
  })

  it('covers both directions, open and closed trades, and recent dates', () => {
    expect(trades.some((trade) => trade.direction === 'long')).toBe(true)
    expect(trades.some((trade) => trade.direction === 'short')).toBe(true)
    expect(trades.some((trade) => trade.closedAt === null)).toBe(true)
    const closed = trades.filter((trade) => trade.closedAt !== null)
    expect(closed.length).toBeGreaterThan(0)
    expect(closed.every((trade) => trade.stopPrice !== null)).toBe(true)
    expect(closed.some((trade) => NOW - trade.openedAt <= 7 * DAY)).toBe(true)
    expect(closed.some((trade) => NOW - trade.openedAt >= 90 * DAY)).toBe(true)
  })

  it('includes assets with and without a current price', () => {
    expect(assets.some((asset) => asset.currentPrice === null)).toBe(true)
    expect(assets.some((asset) => asset.currentPrice !== null)).toBe(true)
  })
})

describe('loadSampleData', () => {
  beforeEach(async () => {
    await clearTrades()
    await clearAssets()
  })

  it('loads sample data and is idempotent', async () => {
    await loadSampleData(NOW)
    const firstTrades = await listTrades()
    const firstAssets = await listAssets()
    await loadSampleData(NOW)
    expect((await listTrades()).length).toBe(firstTrades.length)
    expect((await listAssets()).length).toBe(firstAssets.length)
    expect(firstTrades.length).toBeGreaterThan(0)
    expect(firstAssets.length).toBeGreaterThan(0)
  })
})
