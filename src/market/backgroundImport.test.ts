import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlertEvent } from '@/data/models/price'
import type { TradeDraft } from '@/data/models/trade'
import {
  clearAlertEvents,
  getAlertEvent,
  importAlertEvent,
  listAlertEvents,
} from '@/data/repositories/alerts.repo'
import {
  AUTO_CLOSED_TAG,
  createTrade,
  getTrade,
  replaceAllTrades,
} from '@/data/repositories/trades.repo'
import type { BackgroundEvent } from './background'
import { importBackgroundEvents, QUEUED_EVENT_MAX_AGE_MS } from './backgroundImport'

const NOW = 1_700_000_000_000
const NOTE = 'Auto-closed BTC at 120 (Target hit).'

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

function event(overrides: Partial<BackgroundEvent> = {}): BackgroundEvent {
  return {
    id: 'native-event-1',
    kind: 'target',
    tradeId: 'trade-1',
    ruleId: null,
    symbol: 'BTC',
    price: 130,
    level: 120,
    targetPrice: 120,
    stopPrice: 90,
    direction: 'long',
    at: NOW - 1_000,
    provider: 'binance',
    ...overrides,
  }
}

function alertEvent(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    id: 'native-event-1',
    kind: 'target',
    tradeId: 'trade-1',
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
    createdAt: NOW,
    ...overrides,
  }
}

function noteMock() {
  return vi.fn(() => NOTE)
}

beforeEach(async () => {
  await clearAlertEvents()
  await replaceAllTrades([])
})

afterEach(async () => {
  await clearAlertEvents()
  await replaceAllTrades([])
})

describe('importBackgroundEvents', () => {
  it('closes a fresh target hit at the exact level and imports the native event', async () => {
    const trade = await createTrade(tradeDraft())
    const queued = event({ tradeId: trade.id })
    const note = noteMock()

    const summary = await importBackgroundEvents([queued], NOW, note)

    expect(summary).toEqual({ imported: 1, closed: 1, reviews: 0 })
    expect(note).toHaveBeenCalledOnce()
    expect(note).toHaveBeenCalledWith({
      symbol: 'BTC',
      level: 120,
      reason: 'target',
      at: queued.at,
    })

    expect(await getTrade(trade.id)).toMatchObject({
      status: 'closed',
      exitPrice: 120,
      closedAt: queued.at,
      tags: [AUTO_CLOSED_TAG],
      notes: NOTE,
    })

    expect(await getAlertEvent(queued.id)).toMatchObject({
      id: queued.id,
      kind: 'target',
      tradeId: trade.id,
      symbol: 'BTC',
      price: 130,
      level: 120,
      targetPrice: 120,
      stopPrice: 90,
      at: queued.at,
      provider: 'binance',
      status: 'unread',
      resolution: null,
      readAt: null,
    })
  })

  it('imports a matching hit without closing when autoClose is off', async () => {
    const trade = await createTrade(tradeDraft({ autoClose: false }))
    const note = noteMock()
    const queued = event({ tradeId: trade.id })

    const summary = await importBackgroundEvents([queued], NOW, note)

    expect(summary).toEqual({ imported: 1, closed: 0, reviews: 0 })
    expect(note).not.toHaveBeenCalled()
    expect(await getTrade(trade.id)).toMatchObject({
      status: 'open',
      exitPrice: null,
      closedAt: null,
    })
    expect(await getAlertEvent(queued.id)).toMatchObject({
      kind: 'target',
      tradeId: trade.id,
    })
    expect(await getAlertEvent(`conflict:${queued.id}`)).toBeUndefined()
  })

  it('skips a malformed event and still imports the valid events around it', async () => {
    const before = event({
      id: 'before',
      kind: 'level',
      tradeId: null,
      level: 100,
      targetPrice: null,
      stopPrice: null,
    })
    const after = event({
      id: 'after',
      kind: 'level',
      tradeId: null,
      level: 200,
      targetPrice: null,
      stopPrice: null,
    })
    const malformed = { id: 'malformed' } as unknown as BackgroundEvent

    const summary = await importBackgroundEvents([before, malformed, after], NOW, noteMock())

    expect(summary).toEqual({ imported: 2, closed: 0, reviews: 0 })
    expect((await listAlertEvents()).map((row) => row.id).sort()).toEqual(['after', 'before'])
  })

  it('closes a stop hit at the stop level and preserves existing notes and tags', async () => {
    const trade = await createTrade(
      tradeDraft({ notes: 'original', tags: ['breakout', AUTO_CLOSED_TAG] }),
    )
    const note = vi.fn(() => 'Auto-closed at stop')
    const queued = event({
      id: 'native-stop',
      tradeId: trade.id,
      kind: 'stop',
      price: 80,
      level: 90,
    })

    const summary = await importBackgroundEvents([queued], NOW, note)

    expect(summary).toEqual({ imported: 1, closed: 1, reviews: 0 })
    expect(note).toHaveBeenCalledWith({
      symbol: 'BTC',
      level: 90,
      reason: 'stop',
      at: queued.at,
    })
    expect(await getTrade(trade.id)).toMatchObject({
      status: 'closed',
      exitPrice: 90,
      closedAt: queued.at,
      tags: ['breakout', AUTO_CLOSED_TAG],
      notes: `original\nAuto-closed at stop`,
    })
  })

  it('creates a conflict review for a hit at or older than 24 hours', async () => {
    const trade = await createTrade(tradeDraft())
    const note = noteMock()
    const queued = event({
      tradeId: trade.id,
      at: NOW - QUEUED_EVENT_MAX_AGE_MS,
    })

    const summary = await importBackgroundEvents([queued], NOW, note)

    expect(summary).toEqual({ imported: 0, closed: 0, reviews: 1 })
    expect(note).not.toHaveBeenCalled()
    expect(await getTrade(trade.id)).toMatchObject({ status: 'open' })

    const review = await getAlertEvent(`conflict:${queued.id}`)
    expect(review).toMatchObject({
      id: `conflict:${queued.id}`,
      kind: 'conflict',
      tradeId: trade.id,
      symbol: 'BTC',
      price: 130,
      level: 120,
      targetPrice: 120,
      stopPrice: 90,
      at: queued.at,
      provider: 'binance',
      status: 'unread',
    })
  })

  it('still imports a hit that is one millisecond under 24 hours old', async () => {
    const trade = await createTrade(tradeDraft())
    const queued = event({
      tradeId: trade.id,
      at: NOW - QUEUED_EVENT_MAX_AGE_MS + 1,
    })

    const summary = await importBackgroundEvents([queued], NOW, noteMock())

    expect(summary).toEqual({ imported: 1, closed: 1, reviews: 0 })
  })

  it.each([
    ['target', { targetPrice: 121 }],
    ['stop', { stopPrice: 89 }],
    ['direction', { direction: 'short' as const }],
    ['status', { status: 'closed' as const, exitPrice: 110, closedAt: NOW - 500 }],
  ])('creates a conflict when the trade %s changed', async (_label, patch) => {
    const trade = await createTrade(tradeDraft(patch))
    const queued = event({ tradeId: trade.id })
    const note = noteMock()

    const summary = await importBackgroundEvents([queued], NOW, note)

    expect(summary).toEqual({ imported: 0, closed: 0, reviews: 1 })
    expect(note).not.toHaveBeenCalled()
    expect(await getAlertEvent(`conflict:${queued.id}`)).toMatchObject({ kind: 'conflict' })
    expect(await getAlertEvent(queued.id)).toBeUndefined()
  })

  it('creates a conflict when the event level does not match its level field', async () => {
    const trade = await createTrade(tradeDraft())
    const queued = event({ tradeId: trade.id, level: 121 })

    const summary = await importBackgroundEvents([queued], NOW, noteMock())

    expect(summary).toEqual({ imported: 0, closed: 0, reviews: 1 })
    expect(await getTrade(trade.id)).toMatchObject({ status: 'open' })
  })

  it('imports non-target and non-stop events as normal events', async () => {
    const queued = event({
      id: 'native-level',
      kind: 'level',
      tradeId: null,
      ruleId: 'rule-1',
      level: 100,
      targetPrice: null,
      stopPrice: null,
      direction: 'long',
      at: NOW - 48 * 60 * 60_000,
    })

    const summary = await importBackgroundEvents([queued], NOW, noteMock())

    expect(summary).toEqual({ imported: 1, closed: 0, reviews: 0 })
    expect(await getAlertEvent(queued.id)).toMatchObject({
      id: queued.id,
      kind: 'level',
      ruleId: 'rule-1',
      level: 100,
      at: queued.at,
    })
  })

  it('skips duplicate ids in one batch and on a repeated import', async () => {
    const trade = await createTrade(tradeDraft())
    const queued = event({ tradeId: trade.id })

    expect(await importBackgroundEvents([queued, queued], NOW, noteMock())).toEqual({
      imported: 1,
      closed: 1,
      reviews: 0,
    })
    expect(await importBackgroundEvents([queued], NOW, noteMock())).toEqual({
      imported: 0,
      closed: 0,
      reviews: 0,
    })
    expect((await listAlertEvents()).filter((row) => row.id === queued.id)).toHaveLength(1)
  })

  it('skips an event that already exists under its native id', async () => {
    const trade = await createTrade(tradeDraft())
    const queued = event({ tradeId: trade.id })

    expect(await importAlertEvent(alertEvent({ id: queued.id, tradeId: trade.id }))).toBe(true)
    expect(await importAlertEvent(alertEvent({ id: queued.id, tradeId: trade.id }))).toBe(false)

    expect(await importBackgroundEvents([queued], NOW, noteMock())).toEqual({
      imported: 0,
      closed: 0,
      reviews: 0,
    })
    expect(await getTrade(trade.id)).toMatchObject({ status: 'open' })
  })

  it('does not duplicate a conflict review on repeated imports', async () => {
    const trade = await createTrade(tradeDraft({ targetPrice: 121 }))
    const queued = event({ tradeId: trade.id })

    expect(await importBackgroundEvents([queued], NOW, noteMock())).toEqual({
      imported: 0,
      closed: 0,
      reviews: 1,
    })
    expect(await importBackgroundEvents([queued], NOW, noteMock())).toEqual({
      imported: 0,
      closed: 0,
      reviews: 0,
    })
    expect((await listAlertEvents()).filter((row) => row.kind === 'conflict')).toHaveLength(1)
  })

  it('counts imported events, applied closes and conflict reviews separately', async () => {
    const trade = await createTrade(tradeDraft())
    const changed = await createTrade(tradeDraft({ targetPrice: 121 }))
    const events = [
      event({ id: 'close', tradeId: trade.id }),
      event({ id: 'level', kind: 'level', tradeId: null, targetPrice: null, stopPrice: null }),
      event({ id: 'conflict', tradeId: changed.id }),
    ]

    expect(await importBackgroundEvents(events, NOW, noteMock())).toEqual({
      imported: 2,
      closed: 1,
      reviews: 1,
    })
  })
})
