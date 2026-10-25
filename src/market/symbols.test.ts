import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MarketSymbol } from '@/data/models/price'
import {
  clearMarketSymbols,
  listMarketSymbols,
  replaceMarketSymbols,
} from '@/data/repositories/prices.repo'
import {
  pickPreferredCandidate,
  refreshSymbolLists,
  resolveSymbol,
  type SymbolCandidate,
} from './symbols'
import type { MarketProvider, ProviderSymbol } from './types'

const NOW = Date.UTC(2026, 9, 25, 12)
const DAY = 86_400_000

function provider(id: 'binance' | 'coingecko', rows: ProviderSymbol[]): MarketProvider {
  return {
    id,
    fetchPrices: vi.fn(async () => []),
    fetchSymbols: vi.fn(async () => rows),
  }
}

function cachedSymbol(
  provider: 'binance' | 'coingecko',
  priceId: string,
  symbol: string,
  rank: number | null,
  quote: string | null = provider === 'binance' ? 'USDT' : null,
): MarketSymbol {
  return {
    id: `${provider}:${priceId}`,
    provider,
    priceId,
    symbol,
    name:
      provider === 'coingecko'
        ? symbol === 'BTC'
          ? 'Bitcoin'
          : symbol === 'ETH'
            ? 'Ethereum'
            : symbol
        : symbol,
    quote,
    rank,
    updatedAt: NOW,
  }
}

function candidate(overrides: Partial<SymbolCandidate> = {}): SymbolCandidate {
  return {
    provider: 'binance',
    priceId: 'BTCUSDT',
    symbol: 'BTCUSDT',
    name: null,
    quote: 'USDT',
    rank: null,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    ...overrides,
  }
}

describe('refreshSymbolLists', () => {
  beforeEach(async () => {
    await clearMarketSymbols()
  })

  afterEach(async () => {
    await clearMarketSymbols()
  })

  it('fetches and caches a provider list when the cache is empty', async () => {
    const binance = provider('binance', [
      {
        provider: 'binance',
        priceId: 'BTCUSDT',
        symbol: 'BTCUSDT',
        name: null,
        quote: 'USDT',
        rank: null,
      },
    ])

    await refreshSymbolLists([binance], NOW)

    expect(binance.fetchSymbols).toHaveBeenCalledOnce()
    const rows = await listMarketSymbols('binance')
    expect(rows).toEqual([
      {
        id: 'binance:BTCUSDT',
        provider: 'binance',
        priceId: 'BTCUSDT',
        symbol: 'BTCUSDT',
        name: null,
        quote: 'USDT',
        rank: null,
        updatedAt: NOW,
      },
    ])
  })

  it('skips a provider whose cache is under seven days old and refreshes after that', async () => {
    const binance = provider('binance', [
      {
        provider: 'binance',
        priceId: 'BTCUSDT',
        symbol: 'BTCUSDT',
        name: null,
        quote: 'USDT',
        rank: null,
      },
    ])
    await refreshSymbolLists([binance], NOW)
    expect(binance.fetchSymbols).toHaveBeenCalledOnce()

    await refreshSymbolLists([binance], NOW + 6 * DAY)
    expect(binance.fetchSymbols).toHaveBeenCalledOnce()

    await refreshSymbolLists([binance], NOW + 8 * DAY)
    expect(binance.fetchSymbols).toHaveBeenCalledTimes(2)
  })
})

describe('resolveSymbol', () => {
  beforeEach(async () => {
    await clearMarketSymbols()
    await replaceMarketSymbols('binance', [
      cachedSymbol('binance', 'BTCUSDT', 'BTCUSDT', null, 'USDT'),
      cachedSymbol('binance', 'BTCUSDC', 'BTCUSDC', null, 'USDC'),
      cachedSymbol('binance', 'ETHUSDT', 'ETHUSDT', null, 'USDT'),
    ])
    await replaceMarketSymbols('coingecko', [
      cachedSymbol('coingecko', 'bitcoin', 'BTC', 1),
      cachedSymbol('coingecko', 'ethereum', 'ETH', 2),
    ])
  })

  afterEach(async () => {
    await clearMarketSymbols()
  })

  it('returns exact, USDT and ranked candidates with cross-provider ids', async () => {
    const candidates = await resolveSymbol('BTC', [], NOW)

    expect(candidates.map((row) => `${row.provider}:${row.priceId}`)).toEqual([
      'binance:BTCUSDT',
      'coingecko:bitcoin',
      'binance:BTCUSDC',
    ])
    expect(candidates[0]).toMatchObject({
      provider: 'binance',
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
    expect(candidates[1]).toMatchObject({
      provider: 'coingecko',
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
  })

  it('matches a CoinGecko coin by name', async () => {
    const candidates = await resolveSymbol('bitcoin', [], NOW)

    expect(candidates.map((row) => row.priceId)).toContain('bitcoin')
  })

  it('returns an empty list for an unknown symbol', async () => {
    await expect(resolveSymbol('NOPE', [], NOW)).resolves.toEqual([])
  })

  it('does not overwrite a cache when resolution is called', async () => {
    await resolveSymbol('BTC', [], NOW)

    expect((await listMarketSymbols('binance')).map((row) => row.priceId)).toEqual([
      'BTCUSDC',
      'BTCUSDT',
      'ETHUSDT',
    ])
  })
})

describe('pickPreferredCandidate', () => {
  it('returns a single candidate', () => {
    expect(pickPreferredCandidate([candidate()])).toEqual(candidate())
  })

  it('prefers a USDT quote when only Binance candidates match', () => {
    expect(
      pickPreferredCandidate([
        candidate({ priceId: 'BTCUSDC', symbol: 'BTCUSDC', quote: 'USDC' }),
        candidate(),
      ])?.quote,
    ).toBe('USDT')
  })

  it('returns the clearly top-ranked CoinGecko candidate', () => {
    expect(
      pickPreferredCandidate([
        candidate({
          provider: 'coingecko',
          priceId: 'bitcoin',
          symbol: 'BTC',
          quote: null,
          rank: 1,
        }),
        candidate({
          provider: 'coingecko',
          priceId: 'wrapped-bitcoin',
          symbol: 'WBTC',
          quote: null,
          rank: 2,
        }),
      ])?.priceId,
    ).toBe('bitcoin')
  })

  it('leaves a cross-provider tie to the picker', () => {
    expect(
      pickPreferredCandidate([
        candidate(),
        candidate({
          provider: 'coingecko',
          priceId: 'bitcoin',
          symbol: 'BTC',
          quote: null,
          rank: 1,
        }),
      ]),
    ).toBeNull()
  })

  it('returns null for no candidates', () => {
    expect(pickPreferredCandidate([])).toBeNull()
  })
})
