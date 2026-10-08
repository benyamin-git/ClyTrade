import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearTrades, createTrade, getTrade, updateTrade } from './trades.repo'
import type { TradeDraft } from '../models/trade'

function makeDraft(): TradeDraft {
  return {
    symbol: 'BTCUSDT',
    market: 'crypto',
    direction: 'long',
    status: 'open',
    entryPrice: 50000,
    exitPrice: null,
    size: 0.1,
    leverage: 10,
    stopPrice: null,
    targetPrice: null,
    fees: 5,
    openedAt: 1,
    closedAt: null,
    strategy: null,
    notes: null,
    tags: [],
  }
}

describe('updateTrade', () => {
  beforeEach(async () => {
    await clearTrades()
  })

  afterEach(async () => {
    await clearTrades()
  })

  it('rejects an undefined market without persisting it', async () => {
    const trade = await createTrade(makeDraft())

    await expect(
      updateTrade(trade.id, { market: undefined } as unknown as Partial<TradeDraft>),
    ).rejects.toThrow()

    const stored = await getTrade(trade.id)
    expect(stored?.market).toBe('crypto')
  })

  it('persists a valid partial patch', async () => {
    const trade = await createTrade(makeDraft())

    await updateTrade(trade.id, { entryPrice: 51000, tags: ['breakout'] })

    const stored = await getTrade(trade.id)
    expect(stored?.entryPrice).toBe(51000)
    expect(stored?.tags).toEqual(['breakout'])
    expect(stored?.symbol).toBe('BTCUSDT')
  })

  it('rejects an invalid patch and leaves the stored row unchanged', async () => {
    const trade = await createTrade(makeDraft())

    await expect(updateTrade(trade.id, { entryPrice: 0 })).rejects.toThrow()

    const stored = await getTrade(trade.id)
    expect(stored?.entryPrice).toBe(50000)
  })
})
