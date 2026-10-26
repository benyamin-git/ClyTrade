import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AlertEvent,
  AlertEventDraft,
  PriceAlert,
  PriceAlertDraft,
  PriceCacheEntry,
} from '@/data/models/price'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import type { Trade, TradeDraft } from '@/data/models/trade'
import {
  createAlert,
  createAlertEvent,
  listAlertEvents,
  replaceAllAlertEvents,
  replaceAllAlerts,
} from '@/data/repositories/alerts.repo'
import {
  createTrade,
  getTrade,
  replaceAllTrades,
  AUTO_CLOSED_TAG,
} from '@/data/repositories/trades.repo'
import { clearPriceCache, putPriceCache } from '@/data/repositories/prices.repo'
import { getPreferences, setPreferences } from '@/data/repositories/settings.repo'
import { useUnreadAlertCount } from '@/features/alerts/logic/useUnreadAlertCount'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { formatTime } from '@/lib/dates'
import type { SchedulerStatus } from '@/market/scheduler'
import { STALE_MS, type MarketRef } from '@/market/types'
import { AlertStatusStrip } from '../components/AlertStatusStrip'
import { AlertsPage } from './AlertsPage'

const NOW = 1_700_000_000_000

const priceState = vi.hoisted(() => ({
  refs: [] as MarketRef[],
  reasons: [] as string[],
  status: {
    provider: 'auto',
    activeProvider: null,
    lastSuccessAt: null,
    nextAllowedAt: null,
    error: null,
  } as SchedulerStatus,
  refresh: vi.fn(async (): Promise<void> => undefined),
}))

vi.mock('@/market/usePrices', () => ({
  usePrices: (refs: readonly MarketRef[], reason: string) => {
    priceState.refs = [...refs]
    priceState.reasons.push(reason)
    return { prices: new Map(), status: priceState.status, refresh: priceState.refresh }
  },
}))

vi.mock('@/market/symbols', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/market/symbols')>()
  return { ...actual, resolveSymbol: async () => [] }
})

const platform = vi.hoisted(() => ({ current: 'web' as string }))

vi.mock('@/lib/version', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/version')>()
  return {
    ...actual,
    get APP_PLATFORM() {
      return platform.current
    },
  }
})

const native = vi.hoisted(() => ({
  setNativeBackgroundMonitoring: vi.fn<(enabled: boolean) => void>(),
}))

vi.mock('@/lib/native', () => ({
  isBackgroundPlatform: () =>
    platform.current === 'windows' ||
    platform.current === 'android' ||
    platform.current === 'androideabi',
  setNativeBackgroundMonitoring: native.setNativeBackgroundMonitoring,
}))

const notificationPlugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => 'granted' as NotificationPermission),
}))

vi.mock('@tauri-apps/plugin-notification', () => notificationPlugin)

function alertDraft(overrides: Partial<PriceAlertDraft> = {}): PriceAlertDraft {
  return {
    kind: 'price',
    symbol: 'BTC',
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    priceMode: 'above',
    level: 68000,
    rangeLow: null,
    rangeHigh: null,
    percent: null,
    percentDirection: null,
    repeat: 'once',
    cooldownMinutes: 60,
    referencePrice: null,
    lastPrice: null,
    armed: true,
    enabled: true,
    note: null,
    lastFiredAt: null,
    ...overrides,
  }
}

async function seedAlert(overrides: Partial<PriceAlertDraft> = {}): Promise<PriceAlert> {
  return createAlert(alertDraft(overrides))
}

function tradeDraft(overrides: Partial<TradeDraft> = {}): TradeDraft {
  return {
    symbol: 'BTC',
    market: 'crypto',
    direction: 'long',
    status: 'open',
    entryPrice: 65000,
    exitPrice: null,
    size: 1,
    leverage: 1,
    stopPrice: 60000,
    targetPrice: 70000,
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

async function seedTrade(overrides: Partial<TradeDraft> = {}): Promise<Trade> {
  return createTrade(tradeDraft(overrides))
}

function eventDraft(overrides: Partial<AlertEventDraft> = {}): AlertEventDraft {
  return {
    kind: 'target',
    tradeId: null,
    ruleId: null,
    symbol: 'BTC',
    price: 68000,
    level: 68000,
    targetPrice: null,
    stopPrice: null,
    at: NOW,
    provider: 'binance',
    status: 'unread',
    resolution: null,
    readAt: null,
    ...overrides,
  }
}

async function seedEvent(overrides: Partial<AlertEventDraft> = {}): Promise<AlertEvent> {
  return createAlertEvent(eventDraft(overrides))
}

function cachedPrice(overrides: Partial<PriceCacheEntry> = {}): PriceCacheEntry {
  return {
    key: 'binance:BTCUSDT',
    symbol: 'BTC',
    provider: 'binance',
    price: 65_000,
    fetchedAt: Date.now(),
    sourceTimestamp: null,
    ...overrides,
  }
}

function UnreadProbe() {
  const count = useUnreadAlertCount()
  return <span data-testid="unread-count">{count}</span>
}

function renderPage(locale: 'en' | 'fa' = 'en') {
  return render(
    <SettingsProvider>
      <I18nProvider preference={locale}>
        <AlertsPage />
      </I18nProvider>
    </SettingsProvider>,
  )
}

function renderPageWithProbe() {
  return render(
    <SettingsProvider>
      <I18nProvider preference="en">
        <UnreadProbe />
        <AlertsPage />
      </I18nProvider>
    </SettingsProvider>,
  )
}

class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
}

function stubNotification(permission: NotificationPermission): typeof FakeNotification {
  FakeNotification.permission = permission
  FakeNotification.requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
  vi.stubGlobal('Notification', FakeNotification)
  return FakeNotification
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

beforeEach(async () => {
  platform.current = 'web'
  native.setNativeBackgroundMonitoring.mockReset()
  notificationPlugin.isPermissionGranted.mockReset()
  notificationPlugin.isPermissionGranted.mockResolvedValue(true)
  notificationPlugin.requestPermission.mockReset()
  notificationPlugin.requestPermission.mockResolvedValue('granted')
  await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
  await replaceAllAlerts([])
  await replaceAllTrades([])
  await replaceAllAlertEvents([])
  await clearPriceCache()
  priceState.refs = []
  priceState.reasons = []
  priceState.status = {
    provider: 'auto',
    activeProvider: null,
    lastSuccessAt: null,
    nextAllowedAt: null,
    error: null,
  }
  priceState.refresh.mockReset()
  priceState.refresh.mockImplementation(async () => undefined)
})

describe('AlertsPage', () => {
  it('renders the status, rules, review and history regions', () => {
    renderPage()

    expect(screen.getByRole('region', { name: 'Price status' })).toBe(
      screen.getByTestId('alerts-status'),
    )
    expect(screen.getByRole('region', { name: 'Active rules' })).toBe(
      screen.getByTestId('alerts-rules'),
    )
    expect(screen.getByRole('region', { name: 'Needs review' })).toBe(
      screen.getByTestId('alerts-review'),
    )
    expect(screen.getByRole('region', { name: 'History' })).toBe(
      screen.getByTestId('alerts-history'),
    )
  })

  it('shows the provider status and refreshes on demand', async () => {
    priceState.status = {
      provider: 'auto',
      activeProvider: 'binance',
      lastSuccessAt: NOW,
      nextAllowedAt: null,
      error: null,
    }
    const user = userEvent.setup()
    renderPage()

    const region = screen.getByTestId('alerts-status')
    expect(within(region).getByText('Auto')).toBeInTheDocument()
    expect(within(region).getByText('Binance')).toBeInTheDocument()
    expect(within(region).getByText(formatTime(NOW))).toBeInTheDocument()

    const refresh = within(region).getByRole('button', { name: 'Refresh prices' })
    expect(refresh).toBeEnabled()
    await user.click(refresh)
    expect(priceState.refresh).toHaveBeenCalledOnce()
  })

  it('shows the scheduler error message', () => {
    priceState.status = {
      provider: 'binance',
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt: null,
      error: 'rate-limit',
    }
    renderPage()

    const region = screen.getByTestId('alerts-status')
    expect(within(region).getByText('Rate limit reached. Try again later.')).toBeInTheDocument()
  })

  it('watches active rules and open trades with levels', async () => {
    await seedAlert()
    await seedAlert({
      symbol: 'ETH',
      binanceSymbol: 'ETHUSDT',
      coingeckoId: null,
      level: 3000,
      enabled: false,
    })
    await seedTrade()
    await seedTrade({
      symbol: 'SOL',
      binanceSymbol: 'SOLUSDT',
      targetPrice: 200,
      stopPrice: 150,
    })
    await seedTrade({
      symbol: 'XRP',
      binanceSymbol: 'XRPUSDT',
      status: 'closed',
      exitPrice: 1,
      closedAt: NOW,
    })
    renderPage()

    await screen.findByText('Above 68,000')
    expect(priceState.reasons).toContain('alerts')
    expect(priceState.refs.map((ref) => ref.key).sort()).toEqual([
      'binance:BTCUSDT',
      'binance:SOLUSDT',
    ])
    expect(priceState.refs.find((ref) => ref.key === 'binance:BTCUSDT')).toMatchObject({
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
  })

  it('disables refresh while the manual cooldown is active', () => {
    const nextAllowedAt = Date.now() + 30_000
    priceState.status = {
      provider: 'auto',
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt,
      error: null,
    }
    renderPage()

    const region = screen.getByTestId('alerts-status')
    expect(within(region).getByRole('button', { name: 'Refresh prices' })).toBeDisabled()
    expect(within(region).getByText(formatTime(nextAllowedAt))).toBeInTheDocument()
  })

  it('re-enables refresh when the manual cooldown expires', () => {
    vi.useFakeTimers()
    try {
      const nextAllowedAt = Date.now() + 2_000
      render(
        <I18nProvider preference="en">
          <AlertStatusStrip
            status={{
              provider: 'auto',
              activeProvider: null,
              lastSuccessAt: null,
              nextAllowedAt,
              error: null,
            }}
            onRefresh={() => undefined}
            refreshing={false}
          />
        </I18nProvider>,
      )

      const refresh = screen.getByRole('button', { name: 'Refresh prices' })
      expect(refresh).toBeDisabled()
      act(() => {
        vi.advanceTimersByTime(2_500)
      })
      expect(refresh).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('disables refresh while a refresh is running', () => {
    render(
      <I18nProvider preference="en">
        <AlertStatusStrip
          status={{
            provider: 'auto',
            activeProvider: null,
            lastSuccessAt: null,
            nextAllowedAt: null,
            error: null,
          }}
          onRefresh={() => undefined}
          refreshing
        />
      </I18nProvider>,
    )

    expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled()
  })

  it('shows loading instead of the empty states until the live queries resolve', async () => {
    renderPage()

    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
    expect(screen.queryByText('No alert rules yet')).not.toBeInTheDocument()

    expect(await screen.findByText('No alert rules yet')).toBeInTheDocument()
    expect(screen.getByText('Nothing needs review')).toBeInTheDocument()
    expect(screen.getByText('No alerts yet')).toBeInTheDocument()
  })

  it('filters history by all, unread and event kind', async () => {
    await seedEvent({ kind: 'target', symbol: 'BTC', at: NOW - 1_000, status: 'unread' })
    await seedEvent({
      kind: 'level',
      symbol: 'ETH',
      price: 3000,
      level: 3000,
      at: NOW - 2_000,
      status: 'read',
      readAt: NOW - 1_500,
    })
    await seedEvent({
      kind: 'gap',
      symbol: 'SOL',
      price: 180,
      level: null,
      targetPrice: 200,
      stopPrice: 150,
      at: NOW - 3_000,
      status: 'resolved',
      resolution: 'target',
    })
    const user = userEvent.setup()
    renderPage()

    const history = await screen.findByTestId('alerts-history')
    await waitFor(() => expect(within(history).getAllByRole('listitem')).toHaveLength(3))
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Target hit')
    expect(within(history).getAllByRole('listitem')[1]).toHaveTextContent('Price level')
    expect(within(history).getAllByRole('listitem')[2]).toHaveTextContent('Both levels crossed')

    await user.click(within(history).getByRole('radio', { name: 'Unread' }))
    expect(within(history).getAllByRole('listitem')).toHaveLength(1)
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Target hit')

    await user.click(within(history).getByRole('radio', { name: 'All' }))
    expect(within(history).getAllByRole('listitem')).toHaveLength(3)

    await user.selectOptions(within(history).getByLabelText('Event type'), 'level')
    expect(within(history).getAllByRole('listitem')).toHaveLength(1)
    expect(within(history).getAllByRole('listitem')[0]).toHaveTextContent('Price level')

    await user.selectOptions(within(history).getByLabelText('Event type'), 'all')
    expect(within(history).getAllByRole('listitem')).toHaveLength(3)
  })

  it('marks every unread event as read and updates the badge count', async () => {
    await seedEvent({ symbol: 'BTC', at: NOW - 1_000 })
    await seedEvent({ symbol: 'ETH', price: 3000, level: 3000, at: NOW - 2_000 })
    const user = userEvent.setup()
    renderPageWithProbe()

    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('2'))
    const history = screen.getByTestId('alerts-history')
    await user.click(within(history).getByRole('button', { name: 'Mark all read' }))

    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('0'))
    const events = await listAlertEvents()
    expect(events).toHaveLength(2)
    expect(events.every((event) => event.status === 'read')).toBe(true)
    expect(within(history).getByRole('button', { name: 'Mark all read' })).toBeDisabled()
  })

  it('shows only the newest 500 events', async () => {
    const events = Array.from({ length: 501 }, (_, index) => ({
      ...eventDraft({
        kind: 'level',
        symbol: `S${index}`,
        price: 100 + index,
        level: 100 + index,
        at: NOW + index,
      }),
      id: `event-${index}`,
      createdAt: NOW + index,
    }))
    await replaceAllAlertEvents(events)
    renderPage()

    const history = await screen.findByTestId('alerts-history')
    expect(await within(history).findByText('S500')).toBeInTheDocument()
    expect(within(history).getAllByRole('listitem')).toHaveLength(500)
    expect(within(history).queryByText('S0')).not.toBeInTheDocument()
  })

  it.each([
    ['target', 'Close at target 70,000', 70_000, 'target'],
    ['stop', 'Close at stop 60,000', 60_000, 'stop'],
  ] as const)('closes a gap review at the %s level', async (_, label, level, resolution) => {
    const trade = await seedTrade()
    const event = await seedEvent({
      kind: 'gap',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      targetPrice: 70_000,
      stopPrice: 60_000,
      at: NOW,
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    await user.click(await within(review).findByRole('button', { name: label }))

    await waitFor(async () => {
      const updated = await getTrade(trade.id)
      expect(updated).toMatchObject({ status: 'closed', exitPrice: level, closedAt: NOW })
      expect(updated?.tags).not.toContain(AUTO_CLOSED_TAG)
    })
    await waitFor(async () => {
      const events = await listAlertEvents()
      expect(events.find((entry) => entry.id === event.id)).toMatchObject({
        status: 'resolved',
        resolution,
      })
    })
    await waitFor(() =>
      expect(within(review).queryByText('Both levels crossed')).not.toBeInTheDocument(),
    )
  })

  it('refreshes and dismisses a stale review', async () => {
    const trade = await seedTrade()
    const event = await seedEvent({
      kind: 'stale',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    await user.click(await within(review).findByRole('button', { name: 'Refresh price' }))
    expect(priceState.refresh).toHaveBeenCalledOnce()

    await user.click(within(review).getByRole('button', { name: 'Dismiss' }))
    await waitFor(async () => {
      const events = await listAlertEvents()
      expect(events.find((entry) => entry.id === event.id)).toMatchObject({
        status: 'dismissed',
        resolution: 'dismiss',
      })
    })
    await waitFor(() => expect(within(review).queryByText('Stale price')).not.toBeInTheDocument())
  })

  it('clears a stale review after a successful refresh with a fresh price', async () => {
    const trade = await seedTrade()
    const event = await seedEvent({
      kind: 'stale',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    priceState.refresh.mockImplementationOnce(async () => {
      await putPriceCache([cachedPrice()])
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    await user.click(await within(review).findByRole('button', { name: 'Refresh price' }))

    await waitFor(async () => {
      const events = await listAlertEvents()
      expect(events.find((entry) => entry.id === event.id)).toMatchObject({
        status: 'resolved',
        resolution: 'refresh',
      })
    })
    await waitFor(() => expect(within(review).queryByText('Stale price')).not.toBeInTheDocument())
  })

  it('keeps a stale review when the refreshed price is still stale', async () => {
    const trade = await seedTrade()
    const event = await seedEvent({
      kind: 'stale',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    priceState.refresh.mockImplementationOnce(async () => {
      await putPriceCache([cachedPrice({ fetchedAt: Date.now() - STALE_MS - 1_000 })])
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    await user.click(await within(review).findByRole('button', { name: 'Refresh price' }))
    await waitFor(() => expect(priceState.refresh).toHaveBeenCalledOnce())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    const events = await listAlertEvents()
    expect(events.find((entry) => entry.id === event.id)).toMatchObject({ status: 'unread' })
    expect(within(review).getByText('Stale price')).toBeInTheDocument()
  })

  it('disables the stale review refresh during the manual cooldown', async () => {
    priceState.status = {
      provider: 'auto',
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt: Date.now() + 30_000,
      error: null,
    }
    const trade = await seedTrade()
    await seedEvent({
      kind: 'stale',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    expect(await within(review).findByRole('button', { name: 'Refresh price' })).toBeDisabled()
  })

  it('disables the stale review refresh while a refresh is running', async () => {
    const trade = await seedTrade()
    await seedEvent({
      kind: 'stale',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    let finish: () => void = () => undefined
    priceState.refresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    const status = screen.getByTestId('alerts-status')
    await user.click(within(status).getByRole('button', { name: 'Refresh prices' }))
    await waitFor(() =>
      expect(within(review).getByRole('button', { name: 'Refresh price' })).toBeDisabled(),
    )
    await act(async () => {
      finish()
    })
    await waitFor(() =>
      expect(within(review).getByRole('button', { name: 'Refresh price' })).toBeEnabled(),
    )
  })

  it('resolves a review event after saving an edited trade', async () => {
    const trade = await seedTrade()
    const event = await seedEvent({
      kind: 'conflict',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    await user.click(await within(review).findByRole('button', { name: 'Edit trade' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit BTC' })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => {
      const events = await listAlertEvents()
      expect(events.find((entry) => entry.id === event.id)).toMatchObject({
        status: 'resolved',
        resolution: 'edit',
      })
    })
    await waitFor(() => expect(within(review).queryByText('Trade changed')).not.toBeInTheDocument())
  })

  it('resolves a review event after saving an edited rule', async () => {
    const rule = await seedAlert()
    const event = await seedEvent({
      kind: 'stale',
      ruleId: rule.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    await user.click(await within(review).findByRole('button', { name: 'Edit alert' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit BTC alert' })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => {
      const events = await listAlertEvents()
      expect(events.find((entry) => entry.id === event.id)).toMatchObject({
        status: 'resolved',
        resolution: 'edit',
      })
    })
    await waitFor(() => expect(within(review).queryByText('Stale price')).not.toBeInTheDocument())
  })

  it('opens the trade form from a conflict review', async () => {
    const trade = await seedTrade()
    await seedEvent({
      kind: 'conflict',
      tradeId: trade.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    expect(within(review).queryByRole('button', { name: /Close at/ })).not.toBeInTheDocument()
    await user.click(await within(review).findByRole('button', { name: 'Edit trade' }))

    expect(await screen.findByRole('dialog', { name: 'Edit BTC' })).toBeInTheDocument()
  })

  it('opens the rule form from a stale rule review', async () => {
    const rule = await seedAlert()
    await seedEvent({
      kind: 'stale',
      ruleId: rule.id,
      price: 65_000,
      level: null,
      at: NOW,
    })
    const user = userEvent.setup()
    renderPage()

    const review = await screen.findByTestId('alerts-review')
    await user.click(await within(review).findByRole('button', { name: 'Edit alert' }))

    expect(await screen.findByRole('dialog', { name: 'Edit BTC alert' })).toBeInTheDocument()
  })

  it('renders in Persian and right-to-left', async () => {
    renderPage('fa')

    expect(screen.getByRole('region', { name: 'وضعیت قیمت' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'قواعد فعال' })).toBeInTheDocument()
    expect(await screen.findByText('هنوز قاعدهٔ هشداری ندارید')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'به‌روزرسانی قیمت‌ها' })).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })
})

describe('AlertsPage notification permission', () => {
  it('shows the unsupported state without a request button', () => {
    renderPage()

    const card = screen.getByTestId('alerts-background')
    expect(within(card).getByRole('status')).toHaveTextContent('Not supported')
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it('requests permission from the default state and shows the granted status', async () => {
    const fake = stubNotification('default')
    const user = userEvent.setup()
    renderPage()

    const card = screen.getByTestId('alerts-background')
    expect(within(card).getByRole('status')).toHaveTextContent('Not requested')

    await user.click(within(card).getByRole('button', { name: 'Enable notifications' }))

    expect(fake.requestPermission).toHaveBeenCalledOnce()
    await waitFor(() => expect(within(card).getByRole('status')).toHaveTextContent('Allowed'))
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the blocked state after a denied web request', async () => {
    const fake = stubNotification('default')
    fake.requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'denied')
    const user = userEvent.setup()
    renderPage()

    const card = screen.getByTestId('alerts-background')
    await user.click(within(card).getByRole('button', { name: 'Enable notifications' }))

    await waitFor(() => expect(within(card).getByRole('status')).toHaveTextContent('Blocked'))
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it.each([
    ['granted', 'Allowed'],
    ['denied', 'Blocked'],
  ] as const)('shows the %s state without a request button', (permission, label) => {
    stubNotification(permission)
    renderPage()

    const card = screen.getByTestId('alerts-background')
    expect(within(card).getByRole('status')).toHaveTextContent(label)
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it('localizes the permission line', () => {
    stubNotification('default')
    renderPage('fa')

    const card = screen.getByRole('region', { name: 'پایش پس‌زمینه' })
    expect(within(card).getByRole('status')).toHaveTextContent('درخواست نشده')
    expect(within(card).getByRole('button', { name: 'فعال‌سازی اعلان‌ها' })).toBeInTheDocument()
  })
})

describe('AlertsPage background monitoring', () => {
  it('disables the card in the browser with an explanation', () => {
    renderPage()

    const card = screen.getByTestId('alerts-background')
    const toggle = within(card).getByRole('switch', { name: 'Enable background monitoring' })

    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(within(card).getByText(/not available in the browser/i)).toBeInTheDocument()
  })

  it('shows the Android 15-minute cadence', async () => {
    platform.current = 'android'
    renderPage()

    const card = screen.getByTestId('alerts-background')
    await waitFor(() => expect(notificationPlugin.isPermissionGranted).toHaveBeenCalledOnce())
    expect(within(card).getByRole('switch', { name: 'Enable background monitoring' })).toBeEnabled()
    expect(within(card).getByText(/every 15 minutes/i)).toBeInTheDocument()
  })

  it('shows the Windows 5-minute tray cadence', async () => {
    platform.current = 'windows'
    renderPage()

    const card = screen.getByTestId('alerts-background')
    await waitFor(() => expect(notificationPlugin.isPermissionGranted).toHaveBeenCalledOnce())
    expect(within(card).getByRole('switch', { name: 'Enable background monitoring' })).toBeEnabled()
    expect(within(card).getByText(/every 5 minutes/i)).toBeInTheDocument()
    expect(within(card).queryByText(/every 15 minutes/i)).not.toBeInTheDocument()
  })

  it('requests permission, persists and schedules when enabled', async () => {
    platform.current = 'android'
    notificationPlugin.isPermissionGranted.mockResolvedValue(false)
    const user = userEvent.setup()
    renderPage()

    const card = screen.getByTestId('alerts-background')
    const toggle = within(card).getByRole('switch', { name: 'Enable background monitoring' })
    await waitFor(() => expect(notificationPlugin.isPermissionGranted).toHaveBeenCalledOnce())
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)

    expect(notificationPlugin.requestPermission).toHaveBeenCalledOnce()
    await waitFor(() => expect(native.setNativeBackgroundMonitoring).toHaveBeenCalledWith(true))
    await waitFor(async () => {
      expect((await getPreferences()).backgroundMonitoring).toBe(true)
    })
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })

  it('keeps the toggle off and explains a denied permission request', async () => {
    platform.current = 'android'
    notificationPlugin.isPermissionGranted.mockResolvedValue(false)
    notificationPlugin.requestPermission.mockResolvedValue('denied')
    const user = userEvent.setup()
    renderPage()

    const card = screen.getByTestId('alerts-background')
    const toggle = within(card).getByRole('switch', { name: 'Enable background monitoring' })
    await waitFor(() => expect(notificationPlugin.isPermissionGranted).toHaveBeenCalledOnce())

    await user.click(toggle)

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Allow notifications to turn on background monitoring. In-app alerts keep working.',
    )
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(native.setNativeBackgroundMonitoring).not.toHaveBeenCalled()
    expect((await getPreferences()).backgroundMonitoring).toBe(false)
  })

  it('persists off and cancels scheduling when disabled', async () => {
    platform.current = 'android'
    await setPreferences({
      ...DEFAULT_PREFERENCES,
      language: 'en',
      backgroundMonitoring: true,
    })
    const user = userEvent.setup()
    renderPage()

    const card = screen.getByTestId('alerts-background')
    const toggle = within(card).getByRole('switch', { name: 'Enable background monitoring' })
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))

    await user.click(toggle)

    expect(notificationPlugin.requestPermission).not.toHaveBeenCalled()
    await waitFor(() => expect(native.setNativeBackgroundMonitoring).toHaveBeenCalledWith(false))
    await waitFor(async () => {
      expect((await getPreferences()).backgroundMonitoring).toBe(false)
    })
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'))
  })

  it('localizes the background card', async () => {
    platform.current = 'android'
    renderPage('fa')

    const card = screen.getByRole('region', { name: 'پایش پس‌زمینه' })
    expect(
      within(card).getByRole('switch', { name: 'فعال‌سازی پایش پس‌زمینه' }),
    ).toBeInTheDocument()
    expect(within(card).getByText(/15 دقیقه/)).toBeInTheDocument()
  })
})
