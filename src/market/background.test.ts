import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { PriceAlert } from '@/data/models/price'
import { DEFAULT_PREFERENCES, type Preferences } from '@/data/models/settings'
import type { Trade } from '@/data/models/trade'
import { STALE_MS } from './types'
import {
  buildBackgroundSnapshot,
  clearBackgroundEvents,
  readBackgroundEvents,
  writeBackgroundSnapshot,
  type BackgroundEvent,
} from './background'

const platform = vi.hoisted(() => ({ current: 'web' as string }))

vi.mock('@/lib/version', () => ({
  get APP_PLATFORM() {
    return platform.current
  },
}))

const tauri = vi.hoisted(() => ({
  invoke: vi.fn<(command: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauri.invoke,
}))

const NOW = 1_700_000_000_000

interface FakeBridge {
  setDarkTheme: Mock<(dark: boolean) => void>
  writeBackgroundSnapshot: Mock<(json: string) => void>
  readBackgroundEvents: Mock<() => string>
  clearBackgroundEvents: Mock<() => void>
}

function installBridge(overrides: Partial<FakeBridge> = {}): FakeBridge {
  const bridge: FakeBridge = {
    setDarkTheme: vi.fn<(dark: boolean) => void>(),
    writeBackgroundSnapshot: vi.fn<(json: string) => void>(),
    readBackgroundEvents: vi.fn<() => string>(() => '[]'),
    clearBackgroundEvents: vi.fn<() => void>(),
    ...overrides,
  }
  window.ClyTradeNative = bridge
  return bridge
}

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

function preferences(overrides: Partial<Preferences> = {}): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    priceProvider: 'coingecko',
    backgroundMonitoring: true,
    windowsCloseBehavior: 'tray',
    ...overrides,
  }
}

const NOTIFICATION = { title: 'ClyTrade alerts', body: 'A level was reached.' }

function snapshotInput() {
  return {
    now: NOW,
    locale: 'en' as const,
    preferences: preferences(),
    coingeckoKey: 'demo-key',
    notification: NOTIFICATION,
    trades: [trade()],
    rules: [rule()],
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

beforeEach(() => {
  platform.current = 'web'
  tauri.invoke.mockReset()
  tauri.invoke.mockResolvedValue(undefined)
  delete window.ClyTradeNative
})

afterEach(() => {
  delete window.ClyTradeNative
})

describe('buildBackgroundSnapshot', () => {
  it('publishes the metadata, open trades with levels and enabled mapped rules', () => {
    const snapshot = buildBackgroundSnapshot(snapshotInput())

    expect(snapshot).toEqual({
      version: 1,
      generatedAt: NOW,
      locale: 'en',
      provider: 'coingecko',
      coingeckoKey: 'demo-key',
      backgroundMonitoring: true,
      windowsCloseBehavior: 'tray',
      staleMs: STALE_MS,
      notification: NOTIFICATION,
      trades: [
        {
          id: 'trade-1',
          symbol: 'BTC',
          direction: 'long',
          targetPrice: 120,
          stopPrice: 90,
          autoClose: true,
          binanceSymbol: 'BTCUSDT',
          coingeckoId: null,
          updatedAt: NOW - 1_000,
          priceKey: 'binance:BTCUSDT',
        },
      ],
      rules: [
        {
          id: 'rule-1',
          symbol: 'ETH',
          kind: 'price',
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
          lastFiredAt: null,
          binanceSymbol: 'ETHUSDT',
          coingeckoId: null,
          updatedAt: NOW - 500,
          priceKey: 'binance:ETHUSDT',
        },
      ],
    })
  })

  it('omits closed and level-less trades', () => {
    const snapshot = buildBackgroundSnapshot({
      ...snapshotInput(),
      trades: [
        trade({ id: 'closed', status: 'closed', exitPrice: 110, closedAt: NOW - 500 }),
        trade({ id: 'no-levels', targetPrice: null, stopPrice: null }),
        trade({ id: 'stop-only', targetPrice: null }),
      ],
    })

    expect(snapshot.trades.map((entry) => entry.id)).toEqual(['stop-only'])
  })

  it('omits disabled and unmapped rules and uses the CoinGecko price key', () => {
    const snapshot = buildBackgroundSnapshot({
      ...snapshotInput(),
      rules: [
        rule({ id: 'disabled', enabled: false }),
        rule({ id: 'unmapped', binanceSymbol: null, coingeckoId: null }),
        rule({ id: 'coingecko', binanceSymbol: null, coingeckoId: 'ethereum' }),
      ],
    })

    expect(snapshot.rules.map((entry) => entry.id)).toEqual(['coingecko'])
    expect(snapshot.rules[0]?.priceKey).toBe('coingecko:ethereum')
  })
})

describe('writeBackgroundSnapshot', () => {
  it('serializes the snapshot into the Windows command', async () => {
    platform.current = 'windows'
    const snapshot = buildBackgroundSnapshot(snapshotInput())

    await writeBackgroundSnapshot(snapshot)

    expect(tauri.invoke).toHaveBeenCalledWith('write_background_snapshot', {
      json: JSON.stringify(snapshot),
    })
  })

  it('serializes the snapshot into the Android bridge', async () => {
    platform.current = 'android'
    const bridge = installBridge()
    const snapshot = buildBackgroundSnapshot(snapshotInput())

    await writeBackgroundSnapshot(snapshot)

    expect(bridge.writeBackgroundSnapshot).toHaveBeenCalledWith(JSON.stringify(snapshot))
    expect(tauri.invoke).not.toHaveBeenCalled()
  })

  it('is a no-op on the web', async () => {
    const bridge = installBridge()

    await writeBackgroundSnapshot(buildBackgroundSnapshot(snapshotInput()))

    expect(tauri.invoke).not.toHaveBeenCalled()
    expect(bridge.writeBackgroundSnapshot).not.toHaveBeenCalled()
  })
})

describe('readBackgroundEvents', () => {
  it('parses the Windows command payload', async () => {
    platform.current = 'windows'
    tauri.invoke.mockResolvedValueOnce(JSON.stringify([event()]))

    expect(await readBackgroundEvents()).toEqual([event()])
    expect(tauri.invoke).toHaveBeenCalledWith('read_background_events')
  })

  it('parses the Android bridge payload', async () => {
    platform.current = 'android'
    const bridge = installBridge({
      readBackgroundEvents: vi.fn(() => JSON.stringify([event({ id: 'android-1' })])),
    })

    expect(await readBackgroundEvents()).toEqual([event({ id: 'android-1' })])
    expect(bridge.readBackgroundEvents).toHaveBeenCalledOnce()
  })

  it('returns an empty list for invalid JSON or a non-array payload', async () => {
    platform.current = 'windows'

    tauri.invoke.mockResolvedValueOnce('{not-json')
    expect(await readBackgroundEvents()).toEqual([])

    tauri.invoke.mockResolvedValueOnce('{"events":[]}')
    expect(await readBackgroundEvents()).toEqual([])
  })

  it('returns an empty list on the web', async () => {
    expect(await readBackgroundEvents()).toEqual([])
    expect(tauri.invoke).not.toHaveBeenCalled()
  })
})

describe('clearBackgroundEvents', () => {
  it('calls the Windows command', async () => {
    platform.current = 'windows'

    await clearBackgroundEvents()

    expect(tauri.invoke).toHaveBeenCalledWith('clear_background_events')
  })

  it('calls the Android bridge', async () => {
    platform.current = 'android'
    const bridge = installBridge()

    await clearBackgroundEvents()

    expect(bridge.clearBackgroundEvents).toHaveBeenCalledOnce()
  })

  it('does not throw on the web', async () => {
    await expect(clearBackgroundEvents()).resolves.toBeUndefined()
    expect(tauri.invoke).not.toHaveBeenCalled()
  })
})
