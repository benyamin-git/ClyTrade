import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AlertEventDraft, PriceAlertDraft } from '../models/price'
import {
  clearAlertEvents,
  createAlert,
  createAlertEvent,
  deleteAlert,
  deleteAlertEvent,
  dismissAlertEvent,
  getAlert,
  listAlertEvents,
  listAlerts,
  markAlertEventRead,
  markAllAlertEventsRead,
  pruneAlertEvents,
  resolveAlertEvent,
  updateAlert,
} from './alerts.repo'

function alertDraft(overrides: Partial<PriceAlertDraft> = {}): PriceAlertDraft {
  return {
    kind: 'price',
    symbol: 'BTC',
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    priceMode: 'above',
    level: 70000,
    rangeLow: null,
    rangeHigh: null,
    percent: null,
    percentDirection: null,
    repeat: 'once',
    cooldownMinutes: 60,
    referencePrice: null,
    lastPrice: 68000,
    armed: true,
    enabled: true,
    note: null,
    lastFiredAt: null,
    ...overrides,
  }
}

function eventDraft(at: number, overrides: Partial<AlertEventDraft> = {}): AlertEventDraft {
  return {
    kind: 'level',
    tradeId: null,
    ruleId: null,
    symbol: 'BTC',
    price: 70000,
    level: 70000,
    targetPrice: null,
    stopPrice: null,
    at,
    provider: 'binance',
    status: 'unread',
    resolution: null,
    readAt: null,
    ...overrides,
  }
}

describe('alert repository', () => {
  beforeEach(async () => {
    await clearAlertEvents()
    for (const alert of await listAlerts()) {
      await deleteAlert(alert.id)
    }
  })

  afterEach(async () => {
    await clearAlertEvents()
    for (const alert of await listAlerts()) {
      await deleteAlert(alert.id)
    }
  })

  it('creates, reads, updates and deletes a rule', async () => {
    const created = await createAlert(alertDraft())

    expect(created.id).toBeTruthy()
    expect(created.createdAt).toBeGreaterThan(0)
    expect(await getAlert(created.id)).toMatchObject({ symbol: 'BTC', level: 70000 })
    expect((await listAlerts()).map((alert) => alert.id)).toContain(created.id)

    await updateAlert(created.id, { level: 71000, note: 'updated' })

    const updated = await getAlert(created.id)
    expect(updated?.level).toBe(71000)
    expect(updated?.note).toBe('updated')
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)

    await deleteAlert(created.id)
    expect(await getAlert(created.id)).toBeUndefined()
  })

  it('rejects an undefined patch without persisting it', async () => {
    const created = await createAlert(alertDraft())

    await expect(
      updateAlert(created.id, { level: undefined } as unknown as Partial<PriceAlertDraft>),
    ).rejects.toThrow()

    expect((await getAlert(created.id))?.level).toBe(70000)
  })

  it('lists events newest first and respects the limit', async () => {
    await createAlertEvent(eventDraft(1))
    await createAlertEvent(eventDraft(2))
    await createAlertEvent(eventDraft(3))

    expect((await listAlertEvents(2)).map((event) => event.at)).toEqual([3, 2])
    expect((await listAlertEvents()).map((event) => event.at)).toEqual([3, 2, 1])
  })

  it('deletes one event and keeps the rest', async () => {
    const first = await createAlertEvent(eventDraft(1))
    await createAlertEvent(eventDraft(2))

    await deleteAlertEvent(first.id)

    expect((await listAlertEvents()).map((event) => event.at)).toEqual([2])
  })

  it('ignores deleting an unknown event', async () => {
    await expect(deleteAlertEvent('missing')).resolves.toBeUndefined()
    expect(await listAlertEvents()).toEqual([])
  })

  it('clears every event', async () => {
    await createAlertEvent(eventDraft(1))
    await createAlertEvent(eventDraft(2))

    await clearAlertEvents()

    expect(await listAlertEvents()).toEqual([])
  })

  it('marks one event and all events read', async () => {
    const first = await createAlertEvent(eventDraft(1))
    const second = await createAlertEvent(eventDraft(2))

    await markAlertEventRead(first.id)
    const read = (await listAlertEvents()).find((event) => event.id === first.id)
    expect(read?.status).toBe('read')
    expect(read?.readAt).not.toBeNull()

    await markAllAlertEventsRead()
    expect((await listAlertEvents()).every((event) => event.status !== 'unread')).toBe(true)
    expect((await listAlertEvents()).find((event) => event.id === second.id)?.readAt).not.toBeNull()
  })

  it('resolves an event with its resolution and keeps it read', async () => {
    const event = await createAlertEvent(eventDraft(1))

    await resolveAlertEvent(event.id, 'target')

    const resolved = (await listAlertEvents()).find((row) => row.id === event.id)
    expect(resolved?.status).toBe('resolved')
    expect(resolved?.resolution).toBe('target')
    expect(resolved?.readAt).not.toBeNull()
  })

  it('resolves an event with the refresh resolution', async () => {
    const event = await createAlertEvent(eventDraft(1))

    await resolveAlertEvent(event.id, 'refresh')

    const resolved = (await listAlertEvents()).find((row) => row.id === event.id)
    expect(resolved?.status).toBe('resolved')
    expect(resolved?.resolution).toBe('refresh')
  })

  it('dismisses an event with the dismissed status and resolution', async () => {
    const event = await createAlertEvent(eventDraft(1))

    await dismissAlertEvent(event.id)

    const dismissed = (await listAlertEvents()).find((row) => row.id === event.id)
    expect(dismissed?.status).toBe('dismissed')
    expect(dismissed?.resolution).toBe('dismiss')
    expect(dismissed?.readAt).not.toBeNull()
  })

  it('keeps an existing read time when dismissing', async () => {
    const event = await createAlertEvent(eventDraft(1, { status: 'read', readAt: 42 }))

    await dismissAlertEvent(event.id)

    const dismissed = (await listAlertEvents()).find((row) => row.id === event.id)
    expect(dismissed?.status).toBe('dismissed')
    expect(dismissed?.readAt).toBe(42)
  })

  it('prunes history to the newest 500 events', async () => {
    for (let at = 1; at <= 505; at += 1) {
      await createAlertEvent(eventDraft(at))
    }

    await pruneAlertEvents(500)

    const events = await listAlertEvents(500)
    expect(events).toHaveLength(500)
    expect(events[0]?.at).toBe(505)
    expect(events.at(-1)?.at).toBe(6)
  })
})
