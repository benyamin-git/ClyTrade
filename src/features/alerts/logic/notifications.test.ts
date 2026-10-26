import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlertEvent } from '@/data/models/price'
import { en } from '@/i18n/en'
import { fa } from '@/i18n/fa'
import { createTranslator } from '@/i18n/translate'
import { resetIntlContext, setIntlContext } from '@/lib/intl'
import { buildGroupedNotification, showNotification } from './notifications'

const platform = vi.hoisted(() => ({ current: 'web' as string }))

vi.mock('@/lib/version', () => ({
  get APP_PLATFORM() {
    return platform.current
  },
}))

const plugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(async () => true),
  sendNotification: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-notification', () => plugin)

const NOW = 1_700_000_000_000

const PAYLOAD = {
  title: 'ClyTrade alerts',
  body: 'BTC · Target hit · 70,000',
  tag: 'clytrade-alerts',
}

function event(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    id: 'event-1',
    kind: 'target',
    tradeId: null,
    ruleId: null,
    symbol: 'BTC',
    price: 70_000,
    level: 70_000,
    targetPrice: 70_000,
    stopPrice: null,
    at: NOW,
    provider: 'binance',
    status: 'unread',
    resolution: null,
    readAt: null,
    createdAt: NOW,
    ...overrides,
  }
}

class FakeNotification {
  static permission: NotificationPermission = 'granted'
  static instances: FakeNotification[] = []

  title: string
  options: NotificationOptions | undefined
  onclick: (() => void) | null = null

  constructor(title: string, options?: NotificationOptions) {
    this.title = title
    this.options = options
    FakeNotification.instances.push(this)
  }
}

function stubNotification(permission: NotificationPermission): typeof FakeNotification {
  FakeNotification.permission = permission
  FakeNotification.instances = []
  vi.stubGlobal('Notification', FakeNotification)
  return FakeNotification
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetIntlContext()
})

beforeEach(() => {
  platform.current = 'web'
  plugin.isPermissionGranted.mockReset()
  plugin.isPermissionGranted.mockResolvedValue(true)
  plugin.sendNotification.mockReset()
  FakeNotification.permission = 'granted'
  FakeNotification.instances = []
})

describe('buildGroupedNotification', () => {
  it('returns null when there are no events', () => {
    expect(buildGroupedNotification([], createTranslator(en))).toBeNull()
  })

  it('builds the localized title, one item and the group tag', () => {
    expect(buildGroupedNotification([event()], createTranslator(en))).toEqual(PAYLOAD)
  })

  it('lists five items and summarizes the rest', () => {
    const events = Array.from({ length: 7 }, (_, index) =>
      event({
        id: `event-${index}`,
        symbol: `S${index + 1}`,
        price: 100 + index,
        level: 100 + index,
      }),
    )

    const payload = buildGroupedNotification(events, createTranslator(en))
    const lines = payload?.body.split('\n') ?? []

    expect(lines).toHaveLength(6)
    expect(lines[0]).toBe('S1 · Target hit · 100')
    expect(lines[4]).toBe('S5 · Target hit · 104')
    expect(lines[5]).toBe('+2 more')
    expect(payload?.body).not.toContain('S6')
  })

  it('does not add a more suffix for exactly five items', () => {
    const events = Array.from({ length: 5 }, (_, index) =>
      event({
        id: `event-${index}`,
        symbol: `S${index + 1}`,
        price: 100 + index,
        level: 100 + index,
      }),
    )

    const payload = buildGroupedNotification(events, createTranslator(en))

    expect(payload?.body.split('\n')).toHaveLength(5)
    expect(payload?.body).not.toContain('more')
  })

  it('falls back to the current price when an event has no level', () => {
    const payload = buildGroupedNotification(
      [event({ kind: 'stale', level: null, price: 65_000 })],
      createTranslator(en),
    )

    expect(payload?.body).toBe('BTC · Stale price · 65,000')
  })

  it('localizes the title, item and more suffix in Persian', () => {
    setIntlContext({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })
    const events = Array.from({ length: 6 }, (_, index) =>
      event({
        id: `event-${index}`,
        kind: 'stop',
        symbol: `S${index + 1}`,
        price: 60_000,
        level: 60_000,
      }),
    )

    const payload = buildGroupedNotification(events, createTranslator(fa))

    expect(payload?.title).toBe('هشدارهای ClyTrade')
    expect(payload?.body.split('\n')[0]).toBe('S1 · برخورد با استاپ · 60,000')
    expect(payload?.body.split('\n')[5]).toBe('+1 مورد دیگر')
  })
})

describe('showNotification', () => {
  it('creates a granted web notification that focuses the window and opens Alerts', async () => {
    const fake = stubNotification('granted')
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined)
    window.location.hash = ''

    await showNotification(PAYLOAD)

    expect(fake.instances).toHaveLength(1)
    const notification = fake.instances[0]
    expect(notification?.title).toBe(PAYLOAD.title)
    expect(notification?.options).toMatchObject({ body: PAYLOAD.body, tag: PAYLOAD.tag })

    notification?.onclick?.()

    expect(focus).toHaveBeenCalledOnce()
    expect(window.location.hash).toBe('#/alerts/overview')
    focus.mockRestore()
  })

  it('is a no-op on the web when the API is unsupported', async () => {
    await expect(showNotification(PAYLOAD)).resolves.toBeUndefined()
  })

  it('is a no-op on the web when permission is denied', async () => {
    const fake = stubNotification('denied')

    await showNotification(PAYLOAD)

    expect(fake.instances).toHaveLength(0)
  })

  it('swallows web notification errors', async () => {
    class ThrowingNotification {
      static permission = 'granted'

      constructor() {
        throw new Error('blocked')
      }
    }
    vi.stubGlobal('Notification', ThrowingNotification)

    await expect(showNotification(PAYLOAD)).resolves.toBeUndefined()
  })

  it('sends through the native plugin when permission is granted', async () => {
    platform.current = 'android'
    const fake = stubNotification('granted')

    await showNotification(PAYLOAD)

    expect(fake.instances).toHaveLength(0)
    expect(plugin.isPermissionGranted).toHaveBeenCalledOnce()
    expect(plugin.sendNotification).toHaveBeenCalledWith({
      title: PAYLOAD.title,
      body: PAYLOAD.body,
      extra: { route: '/alerts/overview' },
    })
  })

  it('is a no-op on native when permission is not granted', async () => {
    platform.current = 'android'
    plugin.isPermissionGranted.mockResolvedValueOnce(false)

    await showNotification(PAYLOAD)

    expect(plugin.sendNotification).not.toHaveBeenCalled()
  })

  it('swallows native plugin errors', async () => {
    platform.current = 'android'
    plugin.isPermissionGranted.mockRejectedValueOnce(new Error('missing plugin'))

    await expect(showNotification(PAYLOAD)).resolves.toBeUndefined()
  })
})
