import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyAutoClose, clearTrades, createTrade, getTrade, updateTrade } from './trades.repo'
import type { TradeDraft } from '../models/trade'

function makeDraft(overrides: Partial<TradeDraft> = {}): TradeDraft {
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
    ...overrides,
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

describe('applyAutoClose', () => {
  beforeEach(async () => {
    await clearTrades()
  })

  afterEach(async () => {
    await clearTrades()
  })

  it('closes an open trade at the exact level and appends the tag and note', async () => {
    const trade = await createTrade(makeDraft({ notes: 'original', tags: ['breakout'] }))

    const applied = await applyAutoClose(trade.id, {
      level: 62000,
      at: 1234,
      note: 'hit target',
    })

    expect(applied).toBe(true)
    expect(await getTrade(trade.id)).toMatchObject({
      status: 'closed',
      exitPrice: 62000,
      closedAt: 1234,
      tags: ['breakout', 'auto-closed'],
      notes: 'original\nhit target',
    })
  })

  it('does not duplicate the auto-closed tag or replace existing notes', async () => {
    const trade = await createTrade(makeDraft({ notes: 'original', tags: ['auto-closed'] }))

    await applyAutoClose(trade.id, { level: 62000, at: 1234, note: 'hit target' })

    expect(await getTrade(trade.id)).toMatchObject({
      tags: ['auto-closed'],
      notes: 'original\nhit target',
    })
  })

  it('leaves a missing or already closed trade untouched', async () => {
    expect(await applyAutoClose('missing', { level: 62000, at: 1234, note: 'hit target' })).toBe(
      false,
    )

    const trade = await createTrade(makeDraft())
    await updateTrade(trade.id, { status: 'closed', exitPrice: 1, closedAt: 1 })

    expect(await applyAutoClose(trade.id, { level: 62000, at: 1234, note: 'hit target' })).toBe(
      false,
    )
    expect(await getTrade(trade.id)).toMatchObject({
      status: 'closed',
      exitPrice: 1,
      closedAt: 1,
      tags: [],
      notes: null,
    })
  })
})
