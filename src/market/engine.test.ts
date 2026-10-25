import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateJournalStats } from '@/calculations/journalStats'
import { calculateTradeMetrics } from '@/calculations/tradeMetrics'
import type { AlertEventDraft, PriceAlertDraft } from '@/data/models/price'
import type { TradeDraft } from '@/data/models/trade'
import {
  clearAlertEvents,
  createAlert,
  createAlertEvent,
  deleteAlert,
  getAlert,
  listAlertEvents,
  listAlerts,
  resolveAlertEvent,
} from '@/data/repositories/alerts.repo'
import { clearPriceCache, putPriceCache } from '@/data/repositories/prices.repo'
import { clearTrades, createTrade, getTrade, listTrades } from '@/data/repositories/trades.repo'
import { runAlertEvaluation, type EngineOptions } from './engine'

const NOW = 1_700_000_000_000
const FRESH_AT = NOW - 60_000
const STALE_AT = NOW - 900_000

function tradeDraft(overrides: Partial<TradeDraft> = {}): TradeDraft {
  return {
    symbol: 'BTC',
    market: 'crypto',
    direction: 'long',
    status: 'open',
    entryPrice: 100,
    exitPrice: null,
    size: 1,
    leverage: 1,
    stopPrice: 90,
    targetPrice: 120,
    fees: 0,
    openedAt: NOW - 3_600_000,
    closedAt: null,
    strategy: null,
    notes: null,
    tags: [],
    autoClose: true,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: null,
    ...overrides,
  }
}

async function seedTrade(overrides: Partial<TradeDraft> = {}) {
  return createTrade(tradeDraft(overrides))
}

function ruleDraft(overrides: Partial<PriceAlertDraft> = {}): PriceAlertDraft {
  return {
    kind: 'price',
    symbol: 'BTC',
    binanceSymbol: 'BTCUSDT',
    coingeckoId: null,
    priceMode: 'above',
    level: 100,
    rangeLow: null,
    rangeHigh: null,
    percent: null,
    percentDirection: null,
    repeat: 'once',
    cooldownMinutes: 60,
    referencePrice: null,
    lastPrice: 95,
    armed: true,
    enabled: true,
    note: null,
    lastFiredAt: null,
    ...overrides,
  }
}

async function seedRule(overrides: Partial<PriceAlertDraft> = {}) {
  return createAlert(ruleDraft(overrides))
}

async function seedPrice(price: number, fetchedAt = FRESH_AT): Promise<void> {
  await putPriceCache([
    {
      key: 'binance:BTCUSDT',
      symbol: 'BTCUSDT',
      provider: 'binance',
      price,
      fetchedAt,
      sourceTimestamp: null,
    },
  ])
}

function noteMock() {
  return vi.fn((input: Parameters<EngineOptions['note']>[0]) => {
    return `Auto-closed ${input.symbol} at ${input.level} (${input.reason})`
  })
}

function eventDraft(overrides: Partial<AlertEventDraft> = {}): AlertEventDraft {
  return {
    kind: 'target',
    tradeId: null,
    ruleId: null,
    symbol: 'BTC',
    price: 130,
    level: 120,
    targetPrice: 120,
    stopPrice: 90,
    at: NOW - 1_000,
    provider: 'binance',
    status: 'unread',
    resolution: null,
    readAt: null,
    ...overrides,
  }
}

async function resetDb(): Promise<void> {
  await clearTrades()
  await clearPriceCache()
  await clearAlertEvents()
  for (const rule of await listAlerts()) {
    await deleteAlert(rule.id)
  }
}

describe('runAlertEvaluation', () => {
  beforeEach(resetDb)

  afterEach(async () => {
    vi.restoreAllMocks()
    await resetDb()
  })

  it('closes a fresh target at the exact level and records the close', async () => {
    const trade = await seedTrade({ notes: 'original note', tags: ['breakout'] })
    await seedPrice(130)
    const note = noteMock()

    const summary = await runAlertEvaluation({ now: NOW, note })

    expect(summary).toEqual({ events: 1, closes: 1, reviews: 0 })
    const stored = await getTrade(trade.id)
    if (!stored) throw new Error('trade not found')
    expect(stored.status).toBe('closed')
    expect(stored.exitPrice).toBe(120)
    expect(stored.closedAt).toBe(NOW)
    expect(stored.tags).toEqual(['breakout', 'auto-closed'])
    expect(stored.notes).toBe('original note\nAuto-closed BTC at 120 (target)')

    const events = await listAlertEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      kind: 'target',
      tradeId: trade.id,
      level: 120,
      price: 130,
      status: 'unread',
    })

    expect((await listTrades()).map((row) => row.id)).toContain(trade.id)
    const metrics = calculateTradeMetrics({
      direction: stored.direction,
      entryPrice: stored.entryPrice,
      exitPrice: stored.exitPrice,
      size: stored.size,
      leverage: stored.leverage,
      fees: stored.fees,
      stopPrice: stored.stopPrice,
      targetPrice: stored.targetPrice,
      openedAt: stored.openedAt,
      closedAt: stored.closedAt,
      includeFees: true,
    })
    const stats = calculateJournalStats([
      {
        netPnl: metrics?.netPnl ?? null,
        rMultiple: metrics?.rMultiple ?? null,
        closedAt: stored.closedAt,
      },
    ])
    expect(stats).toMatchObject({ trades: 1, closed: 1, open: 0, netPnl: 20 })
  })

  it('closes a fresh stop at the exact level', async () => {
    const trade = await seedTrade()
    await seedPrice(80)

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 1, closes: 1, reviews: 0 })
    expect(await getTrade(trade.id)).toMatchObject({
      status: 'closed',
      exitPrice: 90,
      closedAt: NOW,
    })
    expect((await listAlertEvents())[0]).toMatchObject({ kind: 'stop', level: 90, price: 80 })
  })

  it('writes only the event when auto-close is off', async () => {
    const trade = await seedTrade({ autoClose: false })
    await seedPrice(130)

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 1, closes: 0, reviews: 0 })
    expect(await getTrade(trade.id)).toMatchObject({
      status: 'open',
      exitPrice: null,
      closedAt: null,
      tags: [],
      notes: null,
    })
    expect(await listAlertEvents()).toHaveLength(1)
  })

  it('creates a gap review and no close when both levels are hit', async () => {
    const trade = await seedTrade({ targetPrice: 90, stopPrice: 110 })
    await seedPrice(100)

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 0, closes: 0, reviews: 1 })
    expect(await getTrade(trade.id)).toMatchObject({ status: 'open', exitPrice: null })
    const events = await listAlertEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      kind: 'gap',
      tradeId: trade.id,
      level: null,
      targetPrice: 90,
      stopPrice: 110,
      price: 100,
      status: 'unread',
    })
  })

  it('creates a stale review and no close for a stale crossed level', async () => {
    const trade = await seedTrade()
    await seedPrice(130, STALE_AT)

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 0, closes: 0, reviews: 1 })
    expect(await getTrade(trade.id)).toMatchObject({ status: 'open', exitPrice: null })
    const events = await listAlertEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'stale', tradeId: trade.id, level: null, price: 130 })
  })

  it('suppresses duplicate unresolved target and stop events', async () => {
    const target = await seedTrade({ autoClose: false, targetPrice: 120, stopPrice: 80 })
    const stop = await seedTrade({ autoClose: false, targetPrice: 150, stopPrice: 140 })
    await seedPrice(130)

    expect(await runAlertEvaluation({ now: NOW, note: noteMock() })).toEqual({
      events: 2,
      closes: 0,
      reviews: 0,
    })
    expect(await runAlertEvaluation({ now: NOW, note: noteMock() })).toEqual({
      events: 0,
      closes: 0,
      reviews: 0,
    })

    const events = await listAlertEvents()
    expect(events).toHaveLength(2)
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tradeId: target.id, kind: 'target', level: 120 }),
        expect.objectContaining({ tradeId: stop.id, kind: 'stop', level: 140 }),
      ]),
    )
  })

  it('dedupes a gap review by kind even when the stored level differs', async () => {
    const trade = await seedTrade({ targetPrice: 90, stopPrice: 110 })
    await seedPrice(100)
    await createAlertEvent(
      eventDraft({
        kind: 'gap',
        tradeId: trade.id,
        level: 777,
        targetPrice: 90,
        stopPrice: 110,
      }),
    )

    expect(await runAlertEvaluation({ now: NOW, note: noteMock() })).toEqual({
      events: 0,
      closes: 0,
      reviews: 0,
    })
    expect(await listAlertEvents()).toHaveLength(1)
  })

  it('dedupes a stale review by kind even when the stored level differs', async () => {
    const trade = await seedTrade()
    await seedPrice(130, STALE_AT)
    await createAlertEvent(eventDraft({ kind: 'stale', tradeId: trade.id, level: 777 }))

    expect(await runAlertEvaluation({ now: NOW, note: noteMock() })).toEqual({
      events: 0,
      closes: 0,
      reviews: 0,
    })
    expect(await listAlertEvents()).toHaveLength(1)
  })

  it('treats read events as unresolved but not dismissed events', async () => {
    const readTrade = await seedTrade({ autoClose: false })
    const dismissedTrade = await seedTrade({ autoClose: false })
    await seedPrice(130)
    await createAlertEvent(
      eventDraft({ tradeId: readTrade.id, status: 'read', readAt: NOW - 1_000 }),
    )
    await createAlertEvent(eventDraft({ tradeId: dismissedTrade.id, status: 'dismissed' }))

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 1, closes: 0, reviews: 0 })
    const events = await listAlertEvents()
    expect(events).toHaveLength(3)
    expect(events.filter((event) => event.tradeId === readTrade.id)).toHaveLength(1)
    expect(events.filter((event) => event.tradeId === dismissedTrade.id)).toHaveLength(2)
  })

  it('writes a new event after the previous one was resolved', async () => {
    const trade = await seedTrade({ autoClose: false })
    await seedPrice(130)
    expect((await runAlertEvaluation({ now: NOW, note: noteMock() })).events).toBe(1)
    const existing = (await listAlertEvents())[0]
    if (!existing) throw new Error('missing event')
    await resolveAlertEvent(existing.id, 'target')

    const summary = await runAlertEvaluation({ now: NOW + 1_000, note: noteMock() })

    expect(summary).toEqual({ events: 1, closes: 0, reviews: 0 })
    expect(await listAlertEvents()).toHaveLength(2)
    expect(await getTrade(trade.id)).toMatchObject({ status: 'open' })
  })

  it('applies a close even when its event was deduped', async () => {
    const trade = await seedTrade()
    await seedPrice(130)
    await createAlertEvent(eventDraft({ tradeId: trade.id, level: 120 }))

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 0, closes: 1, reviews: 0 })
    expect(await getTrade(trade.id)).toMatchObject({
      status: 'closed',
      exitPrice: 120,
      closedAt: NOW,
    })
    expect(await listAlertEvents()).toHaveLength(1)
    expect(await runAlertEvaluation({ now: NOW + 1_000, note: noteMock() })).toEqual({
      events: 0,
      closes: 0,
      reviews: 0,
    })
  })

  it('applies rule updates for a fired once rule and an advancing price', async () => {
    const fired = await seedRule({ level: 100, repeat: 'once' })
    const advanced = await seedRule({ level: 200, repeat: 'once' })
    await seedPrice(105)

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 1, closes: 0, reviews: 0 })
    expect(await getAlert(fired.id)).toMatchObject({
      enabled: false,
      lastPrice: 105,
      lastFiredAt: NOW,
    })
    expect(await getAlert(advanced.id)).toMatchObject({
      enabled: true,
      lastPrice: 105,
      lastFiredAt: null,
    })
    const events = await listAlertEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'level', ruleId: fired.id, level: 100, price: 105 })
    expect(await runAlertEvaluation({ now: NOW + 1_000, note: noteMock() })).toEqual({
      events: 0,
      closes: 0,
      reviews: 0,
    })
  })

  it('suppresses a duplicate unresolved rule event but still applies its update', async () => {
    const rule = await seedRule({ repeat: 'cooldown', level: 100, lastPrice: 95 })
    await seedPrice(105)
    expect((await runAlertEvaluation({ now: NOW, note: noteMock() })).events).toBe(1)

    const later = NOW + 60 * 60_000
    await seedPrice(105, later - 60_000)
    expect(await runAlertEvaluation({ now: later, note: noteMock() })).toEqual({
      events: 0,
      closes: 0,
      reviews: 0,
    })

    expect(await listAlertEvents()).toHaveLength(1)
    expect(await getAlert(rule.id)).toMatchObject({ lastFiredAt: later, lastPrice: 105 })
  })

  it('prunes history to the newest 500 events after writing', async () => {
    for (let at = 1; at <= 500; at += 1) {
      await createAlertEvent(
        eventDraft({
          kind: 'level',
          level: at,
          targetPrice: null,
          stopPrice: null,
          at,
        }),
      )
    }
    await seedTrade({ autoClose: false })
    await seedPrice(130)

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 1, closes: 0, reviews: 0 })
    const events = await listAlertEvents(500)
    expect(events).toHaveLength(500)
    expect(events[0]?.at).toBe(NOW)
    expect(events.some((event) => event.at === 1)).toBe(false)
    expect(events.some((event) => event.at === 2)).toBe(true)
  })

  it('preserves existing notes and tags without duplicating the auto-closed tag', async () => {
    const first = await seedTrade({ notes: 'first note', tags: ['breakout'] })
    const second = await seedTrade({ notes: 'second note', tags: ['auto-closed'] })
    await seedPrice(130)

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 2, closes: 2, reviews: 0 })
    expect(await getTrade(first.id)).toMatchObject({
      tags: ['breakout', 'auto-closed'],
      notes: 'first note\nAuto-closed BTC at 120 (target)',
    })
    expect(await getTrade(second.id)).toMatchObject({
      tags: ['auto-closed'],
      notes: 'second note\nAuto-closed BTC at 120 (target)',
    })
  })

  it('passes the symbol, level, reason and time to the note callback', async () => {
    await seedTrade()
    await seedPrice(80)
    const note = noteMock()

    await runAlertEvaluation({ now: NOW, note })

    expect(note).toHaveBeenCalledTimes(1)
    expect(note).toHaveBeenCalledWith({ symbol: 'BTC', level: 90, reason: 'stop', at: NOW })
  })

  it('defaults the evaluation time to the current clock', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW)
    const trade = await seedTrade()
    await seedPrice(130)

    await runAlertEvaluation({ note: noteMock() })

    expect(nowSpy).toHaveBeenCalled()
    expect(await getTrade(trade.id)).toMatchObject({ status: 'closed', closedAt: NOW })
  })

  it('produces nothing for trades and rules without a cached price', async () => {
    const trade = await seedTrade()
    const rule = await seedRule()

    const summary = await runAlertEvaluation({ now: NOW, note: noteMock() })

    expect(summary).toEqual({ events: 0, closes: 0, reviews: 0 })
    expect(await listAlertEvents()).toEqual([])
    expect(await getTrade(trade.id)).toMatchObject({ status: 'open', exitPrice: null })
    expect(await getAlert(rule.id)).toMatchObject({ lastPrice: 95, enabled: true })
  })
})
