import { describe, expect, it, vi } from 'vitest'
import { createCoinGeckoProvider } from './coingecko'
import type { FetchLike, MarketRef } from '../types'

const NOW = 1_700_000_000_000

function ref(overrides: Partial<MarketRef> & Pick<MarketRef, 'symbol'>): MarketRef {
  return {
    key: `coingecko:${overrides.symbol.toLowerCase()}`,
    binanceSymbol: null,
    coingeckoId: overrides.symbol.toLowerCase(),
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function headerOf(
  call: [RequestInfo | URL, RequestInit?] | undefined,
  name: string,
): string | null {
  return new Headers(call?.[1]?.headers).get(name)
}

describe('coingecko.fetchPrices', () => {
  it('batches mapped ids and maps prices back to canonical refs', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({
        bitcoin: { usd: 68000.5 },
        ethereum: { usd: 3400 },
        dogecoin: { usd: 0 },
        notrequested: { usd: 1 },
      }),
    )
    const provider = createCoinGeckoProvider({ fetchImpl, now: () => NOW })
    const refs = [
      ref({ symbol: 'BTC', coingeckoId: 'bitcoin', key: 'coingecko:bitcoin' }),
      ref({ symbol: 'ETH', coingeckoId: 'ethereum', key: 'coingecko:ethereum' }),
      ref({ symbol: 'DOGE', coingeckoId: 'dogecoin', key: 'coingecko:dogecoin' }),
      ref({ symbol: 'SOL', coingeckoId: null, key: 'symbol:SOL' }),
    ]

    const prices = await provider.fetchPrices(refs)

    expect(fetchImpl).toHaveBeenCalledOnce()
    const url = String(fetchImpl.mock.calls[0]?.[0])
    expect(url).toContain('/simple/price?ids=')
    expect(url).toContain('bitcoin%2Cethereum%2Cdogecoin')
    expect(url).toContain('vs_currencies=usd')
    expect(headerOf(fetchImpl.mock.calls[0], 'x-cg-demo-api-key')).toBeNull()
    expect(prices).toEqual([
      {
        key: 'coingecko:bitcoin',
        symbol: 'BTC',
        provider: 'coingecko',
        price: 68000.5,
        fetchedAt: NOW,
        sourceTimestamp: null,
      },
      {
        key: 'coingecko:ethereum',
        symbol: 'ETH',
        provider: 'coingecko',
        price: 3400,
        fetchedAt: NOW,
        sourceTimestamp: null,
      },
    ])
  })

  it('sends the demo key header only when a key is configured', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse({ bitcoin: { usd: 68000 } }))
    const provider = createCoinGeckoProvider({
      fetchImpl,
      apiKey: 'demo-key',
      now: () => NOW,
    })

    await provider.fetchPrices([
      ref({ symbol: 'BTC', coingeckoId: 'bitcoin', key: 'coingecko:bitcoin' }),
    ])

    expect(headerOf(fetchImpl.mock.calls[0], 'x-cg-demo-api-key')).toBe('demo-key')
  })

  it('returns an empty list without calling fetch when no ref has a CoinGecko id', async () => {
    const fetchImpl = vi.fn<FetchLike>()
    const provider = createCoinGeckoProvider({ fetchImpl })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', coingeckoId: null })]),
    ).resolves.toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('skips invalid or missing prices', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({
        bitcoin: { usd: -1 },
        ethereum: { usd: '3400' },
        solana: { usd: 180 },
      }),
    )
    const provider = createCoinGeckoProvider({ fetchImpl, now: () => NOW })

    const prices = await provider.fetchPrices([
      ref({ symbol: 'BTC', coingeckoId: 'bitcoin' }),
      ref({ symbol: 'ETH', coingeckoId: 'ethereum' }),
      ref({ symbol: 'SOL', coingeckoId: 'solana' }),
    ])

    expect(prices).toHaveLength(1)
    expect(prices[0]?.symbol).toBe('SOL')
  })

  it('rejects a malformed price response as invalid', async () => {
    const provider = createCoinGeckoProvider({
      fetchImpl: vi.fn<FetchLike>(async () => jsonResponse([1, 2, 3])),
    })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', coingeckoId: 'bitcoin' })]),
    ).rejects.toMatchObject({ kind: 'invalid', provider: 'coingecko' })
  })

  it.each([
    [429, 'rate-limit'],
    [401, 'blocked'],
    [403, 'blocked'],
    [400, 'invalid'],
    [500, 'network'],
  ])('maps HTTP %s to %s', async (status, kind) => {
    const provider = createCoinGeckoProvider({
      fetchImpl: vi.fn<FetchLike>(async () => new Response('', { status })),
    })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', coingeckoId: 'bitcoin' })]),
    ).rejects.toMatchObject({ kind, provider: 'coingecko' })
  })

  it('rethrows an abort error instead of wrapping it', async () => {
    const provider = createCoinGeckoProvider({
      fetchImpl: vi.fn<FetchLike>(async () => {
        throw new DOMException('aborted', 'AbortError')
      }),
    })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', coingeckoId: 'bitcoin' })]),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('coingecko.fetchSymbols', () => {
  it('merges top-250 ranks into the coin list', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      const url = String(input)
      if (url.includes('/coins/list')) {
        return jsonResponse([
          { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
          { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
          { id: 'unranked', symbol: 'unr', name: 'Unranked' },
        ])
      }
      if (url.includes('/coins/markets')) {
        return jsonResponse([
          { id: 'ethereum', market_cap_rank: 2 },
          { id: 'bitcoin', market_cap_rank: 1 },
        ])
      }
      throw new Error(`unexpected url ${url}`)
    })
    const provider = createCoinGeckoProvider({ fetchImpl })

    const symbols = await provider.fetchSymbols()

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const marketsUrl = String(fetchImpl.mock.calls[1]?.[0])
    expect(marketsUrl).toContain('/coins/markets?')
    expect(marketsUrl).toContain('vs_currency=usd')
    expect(marketsUrl).toContain('per_page=250')
    expect(marketsUrl).toContain('page=1')
    expect(symbols.map((row) => row.priceId)).toEqual(['bitcoin', 'ethereum', 'unranked'])
    expect(symbols[0]).toMatchObject({
      provider: 'coingecko',
      priceId: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      quote: null,
      rank: 1,
    })
  })

  it('rejects a malformed coin list', async () => {
    const provider = createCoinGeckoProvider({
      fetchImpl: vi.fn<FetchLike>(async () => jsonResponse({ coins: [] })),
    })

    await expect(provider.fetchSymbols()).rejects.toMatchObject({
      kind: 'invalid',
      provider: 'coingecko',
    })
  })

  it('rejects malformed market ranks', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      const url = String(input)
      if (url.includes('/coins/list')) {
        return jsonResponse([{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }])
      }
      return jsonResponse({ ranks: [] })
    })
    const provider = createCoinGeckoProvider({ fetchImpl })

    await expect(provider.fetchSymbols()).rejects.toMatchObject({
      kind: 'invalid',
      provider: 'coingecko',
    })
  })
})
