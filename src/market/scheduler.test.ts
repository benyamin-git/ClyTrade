import { describe, expect, it, vi } from 'vitest'
import type { PriceCacheEntry } from '@/data/models/price'
import { ProviderError } from './providers/errors'
import { createPriceScheduler } from './scheduler'
import type { MarketProvider, MarketRef, ProviderPrice } from './types'

const NOW = 1_700_000_000_000

function ref(
  key: string,
  symbol: string,
  binanceSymbol: string | null,
  coingeckoId: string | null = null,
): MarketRef {
  return { key, symbol, binanceSymbol, coingeckoId }
}

function price(refValue: MarketRef, value = 100): ProviderPrice {
  return {
    key: refValue.key,
    symbol: refValue.symbol,
    provider: refValue.binanceSymbol ? 'binance' : 'coingecko',
    price: value,
    fetchedAt: NOW,
    sourceTimestamp: null,
  }
}

function cacheEntry(refValue: MarketRef, fetchedAt: number, value = 100): PriceCacheEntry {
  return {
    key: refValue.key,
    symbol: refValue.symbol,
    provider: refValue.binanceSymbol ? 'binance' : 'coingecko',
    price: value,
    fetchedAt,
    sourceTimestamp: null,
  }
}

function provider(
  id: 'binance' | 'coingecko',
  fetchPrices: MarketProvider['fetchPrices'],
): MarketProvider {
  return {
    id,
    fetchPrices,
    fetchSymbols: vi.fn(async () => []),
  }
}

function memoryCache(initial: PriceCacheEntry[] = []) {
  const entries = new Map(initial.map((entry) => [entry.key, entry]))
  return {
    entries,
    readCache: vi.fn(async (key: string) => entries.get(key)),
    writeCache: vi.fn(async (next: readonly PriceCacheEntry[]) => {
      for (const entry of next) entries.set(entry.key, entry)
    }),
  }
}

function schedulerOptions(
  overrides: Partial<Parameters<typeof createPriceScheduler>[0]> = {},
): Parameters<typeof createPriceScheduler>[0] {
  return {
    providers: [],
    providerChoice: 'binance',
    now: () => NOW,
    random: () => 0.5,
    ...overrides,
  }
}

describe('price scheduler', () => {
  it('returns a fresh cache entry without fetching', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const cache = memoryCache([cacheEntry(btc, NOW)])
    const fetchPrices = vi.fn(async () => [price(btc)])
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', fetchPrices)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([btc], 'portfolio')

    expect(fetchPrices).not.toHaveBeenCalled()
    expect(prices).toHaveLength(1)
    expect(prices[0]?.price).toBe(100)
  })

  it('fetches a stale entry, writes the cache and updates status', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const cache = memoryCache([cacheEntry(btc, NOW - 6 * 60_000)])
    const fetchPrices = vi.fn(async () => [price(btc, 101)])
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', fetchPrices)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([btc], 'portfolio')

    expect(fetchPrices).toHaveBeenCalledOnce()
    expect(prices[0]?.price).toBe(101)
    expect(cache.entries.get(btc.key)?.price).toBe(101)
    expect(scheduler.getStatus()).toMatchObject({
      provider: 'binance',
      activeProvider: 'binance',
      lastSuccessAt: NOW,
      error: null,
    })
  })

  it('uses the 30-second detail TTL and the 5-minute list TTL', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const cache = memoryCache([cacheEntry(btc, NOW)])
    const detailFetch = vi.fn(async () => [price(btc, 102)])
    const detailScheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', detailFetch)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
        now: () => NOW + 31_000,
      }),
    )

    await detailScheduler.request([btc], 'detail')
    expect(detailFetch).toHaveBeenCalledOnce()

    const listCache = memoryCache([cacheEntry(btc, NOW)])
    const listFetch = vi.fn(async () => [price(btc)])
    const listScheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', listFetch)],
        readCache: listCache.readCache,
        writeCache: listCache.writeCache,
        now: () => NOW + 31_000,
      }),
    )

    await listScheduler.request([btc], 'portfolio')
    expect(listFetch).not.toHaveBeenCalled()
  })

  it('joins an in-flight request for the same provider', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    let resolveFetch: (prices: ProviderPrice[]) => void = () => undefined
    const fetchPrices = vi.fn(
      () =>
        new Promise<ProviderPrice[]>((resolve) => {
          resolveFetch = resolve
        }),
    )
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', fetchPrices)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const first = scheduler.request([btc], 'portfolio')
    const second = scheduler.request([btc], 'portfolio')
    await vi.waitFor(() => expect(fetchPrices).toHaveBeenCalledOnce())

    resolveFetch([price(btc, 103)])
    const [a, b] = await Promise.all([first, second])

    expect(a[0]?.price).toBe(103)
    expect(b[0]?.price).toBe(103)
  })

  it('skips a provider whose budget is exhausted and reports the next time', async () => {
    const first = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const second = ref('binance:ETHUSDT', 'ETH', 'ETHUSDT')
    const fetchPrices = vi.fn(async (refs: MarketRef[]) => refs.map((item) => price(item)))
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', fetchPrices)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
        budgets: {
          binance: { maxRequestsPerMinute: 1, maxWeightPerMinute: 100, minSpacingMs: 0 },
        },
      }),
    )

    await scheduler.request([first], 'portfolio')
    const prices = await scheduler.request([second], 'portfolio')

    expect(fetchPrices).toHaveBeenCalledOnce()
    expect(prices).toEqual([])
    expect(scheduler.getStatus().error).toBe('budget')
    expect(scheduler.getStatus().nextAllowedAt).toBe(NOW + 60_000)
  })

  it('enforces the 60-second manual refresh cooldown', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    let current = NOW
    const fetchPrices = vi.fn(async () => [price(btc)])
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', fetchPrices)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
        now: () => current,
      }),
    )

    await scheduler.refreshNow([btc])
    expect(fetchPrices).toHaveBeenCalledOnce()

    current = NOW + 1_000
    const cached = await scheduler.refreshNow([btc])
    expect(fetchPrices).toHaveBeenCalledOnce()
    expect(cached).toHaveLength(1)
    expect(scheduler.getStatus().error).toBe('manual-cooldown')
    expect(scheduler.getStatus().nextAllowedAt).toBe(NOW + 60_000)

    current = NOW + 60_000
    await scheduler.refreshNow([btc])
    expect(fetchPrices).toHaveBeenCalledTimes(2)
  })

  it('falls back to the other provider in Auto mode', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const binanceFetch = vi.fn(async () => {
      throw new ProviderError('blocked', 'binance', 'HTTP 451')
    })
    const coingeckoFetch = vi.fn(async () => [{ ...price(btc), provider: 'coingecko' as const }])
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providerChoice: 'auto',
        providers: [provider('binance', binanceFetch), provider('coingecko', coingeckoFetch)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([btc], 'portfolio')

    expect(binanceFetch).toHaveBeenCalledOnce()
    expect(coingeckoFetch).toHaveBeenCalledOnce()
    expect(prices[0]?.provider).toBe('coingecko')
    expect(scheduler.getStatus()).toMatchObject({
      activeProvider: 'coingecko',
      error: null,
    })
  })

  it('continues to the next provider when the first serves no needed refs', async () => {
    const eth = ref('coingecko:ethereum', 'ETH', null, 'ethereum')
    const binanceFetch = vi.fn(async () => [])
    const coingeckoFetch = vi.fn(async () => [price(eth, 2500)])
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providerChoice: 'auto',
        providers: [provider('binance', binanceFetch), provider('coingecko', coingeckoFetch)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([eth], 'portfolio')

    expect(binanceFetch).toHaveBeenCalledOnce()
    expect(coingeckoFetch).toHaveBeenCalledOnce()
    expect(coingeckoFetch).toHaveBeenCalledWith([eth])
    expect(prices).toEqual([price(eth, 2500)])
    expect(scheduler.getStatus()).toMatchObject({
      activeProvider: 'coingecko',
      error: null,
    })
  })

  it('asks the next provider only for the refs the first one did not cover', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT', 'bitcoin')
    const eth = ref('coingecko:ethereum', 'ETH', null, 'ethereum')
    const binanceFetch = vi.fn(async () => [price(btc, 101)])
    const coingeckoFetch = vi.fn(async () => [price(eth, 202)])
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providerChoice: 'auto',
        providers: [provider('binance', binanceFetch), provider('coingecko', coingeckoFetch)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([btc, eth], 'portfolio')

    expect(binanceFetch).toHaveBeenCalledOnce()
    expect(coingeckoFetch).toHaveBeenCalledOnce()
    expect(coingeckoFetch).toHaveBeenCalledWith([eth])
    expect(prices).toEqual([price(btc, 101), price(eth, 202)])
    expect(scheduler.getStatus()).toMatchObject({
      activeProvider: 'coingecko',
      error: null,
    })
  })

  it('tries the next provider for stale cache entries the first cannot serve', async () => {
    const eth = ref('coingecko:ethereum', 'ETH', null, 'ethereum')
    const cache = memoryCache([cacheEntry(eth, NOW - 6 * 60_000, 2000)])
    const binanceFetch = vi.fn(async () => [])
    const coingeckoFetch = vi.fn(async () => [price(eth, 2500)])
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providerChoice: 'auto',
        providers: [provider('binance', binanceFetch), provider('coingecko', coingeckoFetch)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([eth], 'portfolio')

    expect(coingeckoFetch).toHaveBeenCalledOnce()
    expect(prices).toEqual([price(eth, 2500)])
    expect(scheduler.getStatus()).toMatchObject({
      activeProvider: 'coingecko',
      error: null,
    })
  })

  it('reports an error when no provider can serve any needed ref', async () => {
    const unknown = ref('symbol:XYZ', 'XYZ', null, null)
    const binanceFetch = vi.fn(async () => [])
    const coingeckoFetch = vi.fn(async () => [])
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providerChoice: 'auto',
        providers: [provider('binance', binanceFetch), provider('coingecko', coingeckoFetch)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([unknown], 'portfolio')

    expect(prices).toEqual([])
    expect(scheduler.getStatus()).toMatchObject({
      activeProvider: null,
      error: 'invalid',
    })
  })

  it('reports an error when only some needed refs are covered', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const unknown = ref('symbol:XYZ', 'XYZ', null, null)
    const binanceFetch = vi.fn(async () => [price(btc)])
    const coingeckoFetch = vi.fn(async () => [])
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providerChoice: 'auto',
        providers: [provider('binance', binanceFetch), provider('coingecko', coingeckoFetch)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
      }),
    )

    const prices = await scheduler.request([btc, unknown], 'portfolio')

    expect(prices).toEqual([price(btc)])
    expect(scheduler.getStatus()).toMatchObject({
      activeProvider: 'binance',
      error: 'invalid',
    })
  })

  it('does not fall back when a provider is pinned', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const binanceFetch = vi.fn(async () => {
      throw new ProviderError('blocked', 'binance', 'HTTP 451')
    })
    const coingeckoFetch = vi.fn(async () => [price(btc)])
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', binanceFetch), provider('coingecko', coingeckoFetch)],
        readCache: memoryCache().readCache,
        writeCache: memoryCache().writeCache,
      }),
    )

    await expect(scheduler.request([btc], 'portfolio')).rejects.toMatchObject({
      kind: 'blocked',
    })
    expect(coingeckoFetch).not.toHaveBeenCalled()
    expect(scheduler.getStatus().error).toBe('blocked')
  })

  it('backs off after a provider error', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    let current = NOW
    const fetchPrices = vi.fn(async () => {
      throw new ProviderError('rate-limit', 'binance', 'HTTP 429')
    })
    const cache = memoryCache()
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', fetchPrices)],
        readCache: cache.readCache,
        writeCache: cache.writeCache,
        now: () => current,
      }),
    )

    await expect(scheduler.request([btc], 'portfolio')).rejects.toMatchObject({
      kind: 'rate-limit',
    })
    current = NOW + 1_000
    await expect(scheduler.request([btc], 'portfolio')).rejects.toMatchObject({
      kind: 'rate-limit',
    })
    expect(fetchPrices).toHaveBeenCalledOnce()
    expect(scheduler.getStatus().nextAllowedAt).toBe(NOW + 30_000)

    current = NOW + 30_000
    await expect(scheduler.request([btc], 'portfolio')).rejects.toMatchObject({
      kind: 'rate-limit',
    })
    expect(fetchPrices).toHaveBeenCalledTimes(2)
  })

  it('notifies subscribers when status changes', async () => {
    const btc = ref('binance:BTCUSDT', 'BTC', 'BTCUSDT')
    const fetchPrices = vi.fn(async () => [price(btc)])
    const scheduler = createPriceScheduler(
      schedulerOptions({
        providers: [provider('binance', fetchPrices)],
        readCache: memoryCache().readCache,
        writeCache: memoryCache().writeCache,
      }),
    )
    const listener = vi.fn()
    scheduler.subscribe(listener)

    await scheduler.request([btc], 'portfolio')

    expect(listener).toHaveBeenCalled()
    expect(listener.mock.calls.at(-1)?.[0]).toMatchObject({ activeProvider: 'binance' })
  })
})
