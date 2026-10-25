import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SchedulerStatus } from './scheduler'
import type { MarketRef, ProviderPrice } from './types'
import { usePrices } from './usePrices'

interface FakeScheduler {
  request: ReturnType<typeof vi.fn>
  refreshNow: ReturnType<typeof vi.fn>
  getStatus: () => SchedulerStatus
  subscribe: (listener: (status: SchedulerStatus) => void) => () => void
  dispose: ReturnType<typeof vi.fn>
}

const harness = vi.hoisted(() => ({
  schedulers: [] as FakeScheduler[],
  priceProvider: 'auto' as 'auto' | 'binance' | 'coingecko',
  apiKey: null as string | null,
}))

vi.mock('@/data/repositories/settings.repo', () => ({
  getPreferences: async () => ({ priceProvider: harness.priceProvider }),
  getMarketApiKey: async () => harness.apiKey,
}))

vi.mock('./scheduler', () => ({
  createPriceScheduler: () => {
    const listeners = new Set<(status: SchedulerStatus) => void>()
    const status: SchedulerStatus = {
      provider: harness.priceProvider,
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt: null,
      error: null,
    }
    const scheduler: FakeScheduler = {
      request: vi.fn(async () => [] as ProviderPrice[]),
      refreshNow: vi.fn(async () => [] as ProviderPrice[]),
      getStatus: () => status,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      dispose: vi.fn(),
    }
    harness.schedulers.push(scheduler)
    return scheduler
  },
}))

const NOW = 1_700_000_000_000

function ref(key = 'binance:BTCUSDT', symbol = 'BTC'): MarketRef {
  return { key, symbol, binanceSymbol: symbol === 'BTC' ? 'BTCUSDT' : 'ETHUSDT', coingeckoId: null }
}

function price(marketRef: MarketRef, value = 68000): ProviderPrice {
  return {
    key: marketRef.key,
    symbol: marketRef.symbol,
    provider: 'binance',
    price: value,
    fetchedAt: NOW,
    sourceTimestamp: null,
  }
}

describe('usePrices', () => {
  beforeEach(() => {
    harness.schedulers = []
    harness.priceProvider = 'auto'
    harness.apiKey = null
  })

  it('shares one scheduler across consumers and disposes it after the last unmount', async () => {
    const refs = [ref()]
    const first = renderHook(() => usePrices(refs, 'portfolio'))
    const second = renderHook(() => usePrices(refs, 'portfolio'))

    await waitFor(() => expect(harness.schedulers).toHaveLength(1))
    const scheduler = harness.schedulers[0]
    expect(scheduler).toBeDefined()
    await waitFor(() => expect(scheduler?.request).toHaveBeenCalledTimes(2))

    first.unmount()
    expect(scheduler?.dispose).not.toHaveBeenCalled()

    second.unmount()
    expect(scheduler?.dispose).toHaveBeenCalledOnce()
  })

  it('requests again only when the ref set changes', async () => {
    const btc = ref()
    const { rerender } = renderHook(({ refs }) => usePrices(refs, 'portfolio'), {
      initialProps: { refs: [btc] },
    })

    await waitFor(() => expect(harness.schedulers).toHaveLength(1))
    const scheduler = harness.schedulers[0]
    await waitFor(() => expect(scheduler?.request).toHaveBeenCalledTimes(1))

    rerender({ refs: [{ ...btc }] })
    expect(scheduler?.request).toHaveBeenCalledTimes(1)

    rerender({ refs: [btc, ref('binance:ETHUSDT', 'ETH')] })
    await waitFor(() => expect(scheduler?.request).toHaveBeenCalledTimes(2))
  })

  it('refreshes through the shared scheduler', async () => {
    const btc = ref()
    const { result } = renderHook(() => usePrices([btc], 'portfolio'))

    await waitFor(() => expect(harness.schedulers).toHaveLength(1))
    const scheduler = harness.schedulers[0]
    expect(scheduler).toBeDefined()
    scheduler?.refreshNow.mockResolvedValueOnce([price(btc, 70000)])

    await act(async () => {
      await result.current.refresh()
    })

    expect(scheduler?.refreshNow).toHaveBeenCalledWith([btc])
    expect(result.current.prices.get(btc.key)?.price).toBe(70000)
  })
})

const FIVE_MINUTES = 5 * 60_000

function timerRequests(scheduler: FakeScheduler | undefined) {
  return scheduler?.request.mock.calls.filter((call) => call[1] === 'timer') ?? []
}

async function flushFakeTimers(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

describe('usePrices foreground refresh', () => {
  beforeEach(() => {
    harness.schedulers = []
    harness.priceProvider = 'auto'
    harness.apiKey = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('requests timer prices every five minutes', async () => {
    const btc = ref()
    const { result } = renderHook(() => usePrices([btc], 'portfolio'))
    await flushFakeTimers()
    await flushFakeTimers()

    const scheduler = harness.schedulers[0]
    expect(scheduler).toBeDefined()
    expect(timerRequests(scheduler)).toHaveLength(0)

    scheduler?.request.mockResolvedValueOnce([price(btc, 69000)])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES)
    })

    expect(timerRequests(scheduler)).toHaveLength(1)
    expect(timerRequests(scheduler)[0]?.[0]).toEqual([btc])
    expect(result.current.prices.get(btc.key)?.price).toBe(69000)
  })

  it('shares one timer across consumers and stops it after the last unmount', async () => {
    const btc = ref()
    const first = renderHook(() => usePrices([btc], 'portfolio'))
    const second = renderHook(() => usePrices([btc], 'portfolio'))
    await flushFakeTimers()
    await flushFakeTimers()

    const scheduler = harness.schedulers[0]
    expect(scheduler).toBeDefined()
    expect(scheduler?.request).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES)
    })
    expect(timerRequests(scheduler)).toHaveLength(1)

    first.unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES)
    })
    expect(timerRequests(scheduler)).toHaveLength(2)

    second.unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES)
    })
    expect(timerRequests(scheduler)).toHaveLength(2)
    expect(scheduler?.dispose).toHaveBeenCalledOnce()
  })

  it('pauses while hidden and refreshes on visibility resume', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const btc = ref()
    renderHook(() => usePrices([btc], 'portfolio'))
    await flushFakeTimers()
    await flushFakeTimers()

    const scheduler = harness.schedulers[0]
    expect(scheduler?.request).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES)
    })
    expect(timerRequests(scheduler)).toHaveLength(0)

    visibility.mockReturnValue('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(timerRequests(scheduler)).toHaveLength(1)
  })

  it('does not reset the timer on a same-content ref array identity change', async () => {
    const btc = ref()
    const { rerender } = renderHook(({ refs }) => usePrices(refs, 'portfolio'), {
      initialProps: { refs: [btc] },
    })
    await flushFakeTimers()
    await flushFakeTimers()

    const scheduler = harness.schedulers[0]
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60_000)
    })
    rerender({ refs: [{ ...btc }] })
    await flushFakeTimers()
    expect(timerRequests(scheduler)).toHaveLength(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(timerRequests(scheduler)).toHaveLength(1)
  })
})
