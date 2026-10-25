import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '@/data/models/asset'
import type { AlertEvent, PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { I18nProvider } from '@/i18n/I18nProvider'
import type { MarketRef, ProviderPrice } from '@/market/types'
import { useForegroundAlerts } from './useForegroundAlerts'

interface RunOptions {
  note: (input: { symbol: string; level: number; reason: 'target' | 'stop'; at: number }) => string
}

interface RunSummary {
  events: number
  closes: number
  reviews: number
}

const state = vi.hoisted(() => ({
  data: undefined as { trades: Trade[]; rules: PriceAlert[]; assets: Asset[] } | undefined,
  prices: new Map() as ReadonlyMap<string, ProviderPrice>,
  refs: [] as MarketRef[],
  reasons: [] as string[],
}))

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => state.data,
}))

vi.mock('@/market/usePrices', () => ({
  usePrices: (refs: readonly MarketRef[], reason: string) => {
    state.refs = [...refs]
    state.reasons.push(reason)
    return {
      prices: state.prices,
      status: {
        provider: 'auto',
        activeProvider: null,
        lastSuccessAt: null,
        nextAllowedAt: null,
        error: null,
      },
      refresh: async () => undefined,
    }
  },
}))

const engine = vi.hoisted(() => ({
  runAlertEvaluation: vi.fn<(options: RunOptions) => Promise<RunSummary>>(),
}))

vi.mock('@/market/engine', () => engine)

const repo = vi.hoisted(() => ({
  listAlertEvents: vi.fn<() => Promise<AlertEvent[]>>(),
}))

vi.mock('@/data/repositories/alerts.repo', () => repo)

const NOW = 1_700_000_000_000

function trade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
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
    createdAt: NOW - 3_600_000,
    updatedAt: NOW - 1_000,
    ...overrides,
  }
}

function rule(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: 'rule-1',
    kind: 'price',
    symbol: 'ETH',
    binanceSymbol: 'ETHUSDT',
    coingeckoId: null,
    priceMode: 'above',
    level: 3000,
    rangeLow: null,
    rangeHigh: null,
    percent: null,
    percentDirection: null,
    repeat: 'once',
    cooldownMinutes: 60,
    referencePrice: null,
    lastPrice: 2900,
    armed: true,
    enabled: true,
    note: null,
    lastFiredAt: null,
    createdAt: NOW - 2_000,
    updatedAt: NOW - 500,
    ...overrides,
  }
}

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    symbol: 'BNB',
    market: 'crypto',
    name: null,
    quantity: 1,
    averageCost: 1,
    currentPrice: null,
    notes: null,
    autoPrice: true,
    binanceSymbol: null,
    coingeckoId: 'binancecoin',
    createdAt: NOW - 2_000,
    updatedAt: NOW - 500,
    ...overrides,
  }
}

function event(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    id: 'event-1',
    kind: 'target',
    tradeId: 'trade-1',
    ruleId: null,
    symbol: 'BTC',
    price: 130,
    level: 120,
    targetPrice: 120,
    stopPrice: 90,
    at: NOW,
    provider: 'binance',
    status: 'unread',
    resolution: null,
    readAt: null,
    createdAt: NOW,
    ...overrides,
  }
}

function price(key = 'binance:BTCUSDT', value = 130): ProviderPrice {
  return {
    key,
    symbol: 'BTC',
    provider: 'binance',
    price: value,
    fetchedAt: NOW,
    sourceTimestamp: null,
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

function stubNotification(permission: NotificationPermission): void {
  FakeNotification.permission = permission
  FakeNotification.instances = []
  vi.stubGlobal('Notification', FakeNotification)
}

function renderAlertsHook(locale: 'en' | 'fa' = 'en') {
  return renderHook(() => useForegroundAlerts(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nProvider preference={locale}>{children}</I18nProvider>
    ),
  })
}

function defaultData() {
  return {
    trades: [
      trade(),
      trade({
        id: 'closed-trade',
        symbol: 'ETH',
        status: 'closed',
        exitPrice: 110,
        closedAt: NOW - 500,
        binanceSymbol: 'ETHUSDT',
      }),
      trade({
        id: 'no-levels',
        symbol: 'SOL',
        targetPrice: null,
        stopPrice: null,
        binanceSymbol: 'SOLUSDT',
      }),
    ],
    rules: [
      rule(),
      rule({ id: 'disabled-rule', symbol: 'XRP', enabled: false, binanceSymbol: 'XRPUSDT' }),
    ],
    assets: [
      asset(),
      asset({ id: 'no-auto-price', symbol: 'ADA', autoPrice: false, coingeckoId: 'cardano' }),
      asset({ id: 'forex', symbol: 'EURUSD', market: 'forex', autoPrice: true, coingeckoId: null }),
    ],
  }
}

async function flushAsync(): Promise<void> {
  for (let index = 0; index < 4; index += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  state.data = defaultData()
  state.prices = new Map()
  state.refs = []
  state.reasons = []
  engine.runAlertEvaluation.mockReset()
  engine.runAlertEvaluation.mockResolvedValue({ events: 0, closes: 0, reviews: 0 })
  repo.listAlertEvents.mockReset()
  repo.listAlertEvents.mockResolvedValue([])
  stubNotification('granted')
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

describe('useForegroundAlerts', () => {
  it('requests prices for open trades with levels, enabled rules and crypto auto-price assets', () => {
    renderAlertsHook()

    expect(state.reasons).toContain('timer')
    expect(state.refs.map((ref) => ref.key)).toEqual([
      'binance:BTCUSDT',
      'binance:ETHUSDT',
      'coingecko:binancecoin',
    ])
  })

  it('runs the evaluator only after a non-empty price update', async () => {
    const { rerender } = renderAlertsHook()

    await flushAsync()
    expect(engine.runAlertEvaluation).not.toHaveBeenCalled()

    state.prices = new Map([['binance:BTCUSDT', price()]])
    rerender()

    await waitFor(() => expect(engine.runAlertEvaluation).toHaveBeenCalledOnce())
  })

  it('passes a localized auto-close note to the evaluator', async () => {
    const { rerender } = renderAlertsHook()
    state.prices = new Map([['binance:BTCUSDT', price()]])
    rerender()

    await waitFor(() => expect(engine.runAlertEvaluation).toHaveBeenCalledOnce())
    const options = engine.runAlertEvaluation.mock.calls[0]?.[0]

    expect(options?.note({ symbol: 'BTC', level: 120, reason: 'target', at: NOW })).toBe(
      'Auto-closed BTC at 120 (Target hit).',
    )
  })

  it('localizes the auto-close note in Persian', async () => {
    const { rerender } = renderAlertsHook('fa')
    state.prices = new Map([['binance:BTCUSDT', price()]])
    rerender()

    await waitFor(() => expect(engine.runAlertEvaluation).toHaveBeenCalledOnce())
    const options = engine.runAlertEvaluation.mock.calls[0]?.[0]

    expect(options?.note({ symbol: 'BTC', level: 120, reason: 'stop', at: NOW })).toBe(
      'بستهٔ خودکار BTC در 120 (برخورد با استاپ).',
    )
  })

  it('shows one grouped notification for newly created unread events', async () => {
    repo.listAlertEvents.mockResolvedValueOnce([]).mockResolvedValueOnce([event()])
    const { rerender } = renderAlertsHook()
    state.prices = new Map([['binance:BTCUSDT', price()]])
    rerender()

    await waitFor(() => expect(FakeNotification.instances).toHaveLength(1))
    expect(FakeNotification.instances[0]?.title).toBe('ClyTrade alerts')
    expect(FakeNotification.instances[0]?.options).toMatchObject({
      body: 'BTC · Target hit · 120',
      tag: 'clytrade-alerts',
    })
  })

  it('does not notify when the run created no unread events', async () => {
    const { rerender } = renderAlertsHook()
    state.prices = new Map([['binance:BTCUSDT', price()]])
    rerender()

    await waitFor(() => expect(engine.runAlertEvaluation).toHaveBeenCalledOnce())
    await waitFor(() => expect(repo.listAlertEvents).toHaveBeenCalledTimes(2))

    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('does not notify when permission is denied', async () => {
    stubNotification('denied')
    repo.listAlertEvents.mockResolvedValueOnce([]).mockResolvedValueOnce([event()])
    const { rerender } = renderAlertsHook()
    state.prices = new Map([['binance:BTCUSDT', price()]])
    rerender()

    await waitFor(() => expect(engine.runAlertEvaluation).toHaveBeenCalledOnce())
    await waitFor(() => expect(repo.listAlertEvents).toHaveBeenCalledTimes(2))

    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('does not run the evaluator concurrently', async () => {
    let resolveRun: ((summary: RunSummary) => void) | undefined
    engine.runAlertEvaluation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRun = resolve
        }),
    )
    const { rerender } = renderAlertsHook()
    state.prices = new Map([['binance:BTCUSDT', price()]])
    rerender()

    await waitFor(() => expect(engine.runAlertEvaluation).toHaveBeenCalledOnce())

    state.prices = new Map([['binance:BTCUSDT', price('binance:BTCUSDT', 131)]])
    rerender()
    await flushAsync()
    expect(engine.runAlertEvaluation).toHaveBeenCalledOnce()

    await act(async () => {
      resolveRun?.({ events: 0, closes: 0, reviews: 0 })
      await Promise.resolve()
      await Promise.resolve()
    })

    state.prices = new Map([['binance:BTCUSDT', price('binance:BTCUSDT', 132)]])
    rerender()
    await waitFor(() => expect(engine.runAlertEvaluation).toHaveBeenCalledTimes(2))
  })
})
