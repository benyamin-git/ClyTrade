import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PriceAlert } from '@/data/models/price'
import { DEFAULT_PREFERENCES, type Preferences } from '@/data/models/settings'
import type { Trade } from '@/data/models/trade'
import { I18nProvider } from '@/i18n/I18nProvider'
import { STALE_MS } from '@/market/types'
import type { BackgroundEvent, BackgroundSnapshot } from '@/market/background'
import type { BackgroundImportSummary, BackgroundNote } from '@/market/backgroundImport'
import { useBackgroundSync } from './useBackgroundSync'

const state = vi.hoisted(() => ({
  platform: 'android' as string,
  data: undefined as { trades: Trade[]; rules: PriceAlert[]; apiKey: string | null } | undefined,
  preferences: null as Preferences | null,
}))

vi.mock('@/lib/version', () => ({
  get APP_PLATFORM() {
    return state.platform
  },
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => undefined),
}))

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => state.data,
}))

vi.mock('@/features/settings/SettingsContext', () => ({
  usePreferences: () => ({
    preferences: state.preferences,
    setPreferences: () => undefined,
    updatePreferences: () => undefined,
    ready: true,
    error: null,
  }),
}))

const background = vi.hoisted(() => ({
  writeBackgroundSnapshot: vi.fn<(snapshot: BackgroundSnapshot) => Promise<void>>(
    async () => undefined,
  ),
  readBackgroundEvents: vi.fn<() => Promise<BackgroundEvent[]>>(async () => []),
  clearBackgroundEvents: vi.fn<() => Promise<void>>(async () => undefined),
}))

vi.mock('@/market/background', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/market/background')>()
  return { ...actual, ...background }
})

const importer = vi.hoisted(() => ({
  importBackgroundEvents: vi.fn<
    (
      events: readonly BackgroundEvent[],
      now: number,
      note: BackgroundNote,
    ) => Promise<BackgroundImportSummary>
  >(async () => ({ imported: 0, closed: 0, reviews: 0 })),
}))

vi.mock('@/market/backgroundImport', () => importer)

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

function event(overrides: Partial<BackgroundEvent> = {}): BackgroundEvent {
  return {
    id: 'native-event-1',
    kind: 'level',
    tradeId: null,
    ruleId: 'rule-1',
    symbol: 'ETH',
    price: 3100,
    level: 3000,
    targetPrice: null,
    stopPrice: null,
    direction: 'long',
    at: NOW - 1_000,
    provider: 'binance',
    ...overrides,
  }
}

function preferences(overrides: Partial<Preferences> = {}): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    backgroundMonitoring: true,
    windowsCloseBehavior: 'tray',
    ...overrides,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider preference="en">{children}</I18nProvider>
}

async function flushAsync(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  state.platform = 'android'
  state.preferences = preferences()
  state.data = {
    trades: [trade()],
    rules: [rule()],
    apiKey: 'demo-key',
  }
  background.writeBackgroundSnapshot.mockClear()
  background.readBackgroundEvents.mockReset()
  background.readBackgroundEvents.mockResolvedValue([])
  background.clearBackgroundEvents.mockClear()
  importer.importBackgroundEvents.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

describe('useBackgroundSync', () => {
  it('writes the snapshot after a 500 ms debounce', async () => {
    renderHook(() => useBackgroundSync(), { wrapper })

    expect(background.writeBackgroundSnapshot).not.toHaveBeenCalled()

    await advance(499)
    expect(background.writeBackgroundSnapshot).not.toHaveBeenCalled()

    await advance(1)
    expect(background.writeBackgroundSnapshot).toHaveBeenCalledOnce()

    const snapshot = background.writeBackgroundSnapshot.mock.calls[0]?.[0]
    expect(snapshot).toMatchObject({
      version: 1,
      locale: 'en',
      provider: 'auto',
      coingeckoKey: 'demo-key',
      backgroundMonitoring: true,
      windowsCloseBehavior: 'tray',
      staleMs: STALE_MS,
      notification: {
        title: 'ClyTrade alerts',
        body: 'A price level was reached while ClyTrade was in the background.',
      },
    })
    expect(snapshot?.trades).toEqual([
      expect.objectContaining({ id: 'trade-1', priceKey: 'binance:BTCUSDT' }),
    ])
    expect(snapshot?.rules).toEqual([
      expect.objectContaining({ id: 'rule-1', priceKey: 'binance:ETHUSDT' }),
    ])
  })

  it('publishes the Persian locale and notification copy', async () => {
    const faWrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider preference="fa">{children}</I18nProvider>
    )

    renderHook(() => useBackgroundSync(), { wrapper: faWrapper })
    await advance(500)

    expect(background.writeBackgroundSnapshot).toHaveBeenCalledOnce()
    expect(background.writeBackgroundSnapshot.mock.calls[0]?.[0]).toMatchObject({
      locale: 'fa',
      notification: {
        title: 'هشدارهای ClyTrade',
        body: 'در حالی که ClyTrade در پس‌زمینه بود، قیمت به یک سطح رسید.',
      },
    })
  })

  it('debounces rapid trade and rule changes into one write with the latest data', async () => {
    const { rerender } = renderHook(() => useBackgroundSync(), { wrapper })
    await advance(500)
    background.writeBackgroundSnapshot.mockClear()

    state.data = { ...state.data!, trades: [trade({ id: 'trade-2' })] }
    rerender()
    await advance(300)

    state.data = {
      ...state.data!,
      trades: [trade({ id: 'trade-3' })],
      rules: [rule({ id: 'rule-2' })],
    }
    rerender()
    await advance(499)

    expect(background.writeBackgroundSnapshot).not.toHaveBeenCalled()

    await advance(1)
    expect(background.writeBackgroundSnapshot).toHaveBeenCalledOnce()
    const snapshot = background.writeBackgroundSnapshot.mock.calls[0]?.[0]
    expect(snapshot?.trades[0]?.id).toBe('trade-3')
    expect(snapshot?.rules[0]?.id).toBe('rule-2')
  })

  it('writes the snapshot when preferences change', async () => {
    const { rerender } = renderHook(() => useBackgroundSync(), { wrapper })
    await advance(500)
    background.writeBackgroundSnapshot.mockClear()

    state.preferences = preferences({ priceProvider: 'binance', windowsCloseBehavior: 'quit' })
    rerender()
    await advance(500)

    expect(background.writeBackgroundSnapshot).toHaveBeenCalledOnce()
    expect(background.writeBackgroundSnapshot.mock.calls[0]?.[0]).toMatchObject({
      provider: 'binance',
      windowsCloseBehavior: 'quit',
    })
  })

  it('imports queued events on mount and then clears the queue', async () => {
    const queued = event()
    background.readBackgroundEvents.mockResolvedValueOnce([queued])

    renderHook(() => useBackgroundSync(), { wrapper })
    await flushAsync()

    expect(background.readBackgroundEvents).toHaveBeenCalledOnce()
    expect(importer.importBackgroundEvents).toHaveBeenCalledOnce()
    expect(importer.importBackgroundEvents.mock.calls[0]?.[0]).toEqual([queued])
    expect(importer.importBackgroundEvents.mock.calls[0]?.[1]).toEqual(expect.any(Number))
    expect(background.clearBackgroundEvents).toHaveBeenCalledOnce()
    expect(importer.importBackgroundEvents.mock.invocationCallOrder[0]).toBeLessThan(
      background.clearBackgroundEvents.mock.invocationCallOrder[0] ?? 0,
    )

    const note = importer.importBackgroundEvents.mock.calls[0]?.[2]
    expect(note?.({ symbol: 'ETH', level: 3000, reason: 'target', at: NOW })).toBe(
      'Auto-closed ETH at 3,000 (Target hit).',
    )
  })

  it('imports again when the document becomes visible', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const queued = event({ id: 'native-event-2' })
    renderHook(() => useBackgroundSync(), { wrapper })
    await flushAsync()

    background.readBackgroundEvents.mockClear()
    background.clearBackgroundEvents.mockClear()
    importer.importBackgroundEvents.mockClear()
    background.readBackgroundEvents.mockResolvedValueOnce([queued])

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await flushAsync()

    expect(background.readBackgroundEvents).toHaveBeenCalledOnce()
    expect(importer.importBackgroundEvents).toHaveBeenCalledWith(
      [queued],
      expect.any(Number),
      expect.any(Function),
    )
    expect(background.clearBackgroundEvents).toHaveBeenCalledOnce()

    visibility.mockRestore()
  })

  it('does not import while the document is hidden', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    renderHook(() => useBackgroundSync(), { wrapper })
    await flushAsync()

    background.readBackgroundEvents.mockClear()

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await flushAsync()

    expect(background.readBackgroundEvents).not.toHaveBeenCalled()

    visibility.mockRestore()
  })

  it('clears the queue after an empty read', async () => {
    renderHook(() => useBackgroundSync(), { wrapper })
    await flushAsync()

    expect(background.readBackgroundEvents).toHaveBeenCalledOnce()
    expect(importer.importBackgroundEvents).not.toHaveBeenCalled()
    expect(background.clearBackgroundEvents).toHaveBeenCalledOnce()
  })

  it('keeps the queue when the read fails', async () => {
    background.readBackgroundEvents.mockRejectedValueOnce(new Error('native unavailable'))

    renderHook(() => useBackgroundSync(), { wrapper })
    await flushAsync()

    expect(background.clearBackgroundEvents).not.toHaveBeenCalled()
  })

  it('is a no-op on the web', async () => {
    state.platform = 'web'

    renderHook(() => useBackgroundSync(), { wrapper })
    await flushAsync()
    await advance(500)

    expect(background.writeBackgroundSnapshot).not.toHaveBeenCalled()
    expect(background.readBackgroundEvents).not.toHaveBeenCalled()
    expect(background.clearBackgroundEvents).not.toHaveBeenCalled()
    expect(importer.importBackgroundEvents).not.toHaveBeenCalled()
  })
})
