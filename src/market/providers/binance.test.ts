import { describe, expect, it, vi } from 'vitest'
import { createBinanceProvider } from './binance'
import { ProviderError } from './errors'
import type { FetchLike, MarketRef } from '../types'

const NOW = 1_700_000_000_000

function ref(overrides: Partial<MarketRef> & Pick<MarketRef, 'symbol'>): MarketRef {
  return {
    key: `binance:${overrides.symbol}`,
    binanceSymbol: overrides.symbol,
    coingeckoId: null,
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('binance.fetchPrices', () => {
  it('batches mapped symbols and maps prices back to canonical refs', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse([
        { symbol: 'BTCUSDT', price: '68000.50' },
        { symbol: 'ETHUSDT', price: '3400' },
        { symbol: 'NOTREQUESTED', price: '1' },
      ]),
    )
    const provider = createBinanceProvider({ fetchImpl, now: () => NOW })
    const refs = [
      ref({ symbol: 'BTC', binanceSymbol: 'BTCUSDT', key: 'binance:BTCUSDT' }),
      ref({ symbol: 'ETH', binanceSymbol: 'ETHUSDT', key: 'binance:ETHUSDT' }),
      ref({ symbol: 'SOL', binanceSymbol: null, key: 'symbol:SOL' }),
      ref({ symbol: 'XRP', binanceSymbol: 'XRPUSDT', key: 'binance:XRPUSDT' }),
    ]

    const prices = await provider.fetchPrices(refs)

    expect(fetchImpl).toHaveBeenCalledOnce()
    const url = String(fetchImpl.mock.calls[0]?.[0])
    expect(url).toContain('/api/v3/ticker/price?symbols=')
    expect(decodeURIComponent(url)).toContain('["BTCUSDT","ETHUSDT","XRPUSDT"]')
    expect(prices).toEqual([
      {
        key: 'binance:BTCUSDT',
        symbol: 'BTC',
        provider: 'binance',
        price: 68000.5,
        fetchedAt: NOW,
        sourceTimestamp: null,
      },
      {
        key: 'binance:ETHUSDT',
        symbol: 'ETH',
        provider: 'binance',
        price: 3400,
        fetchedAt: NOW,
        sourceTimestamp: null,
      },
    ])
  })

  it('returns an empty list without calling fetch when no ref has a Binance symbol', async () => {
    const fetchImpl = vi.fn()
    const provider = createBinanceProvider({ fetchImpl, now: () => NOW })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', binanceSymbol: null })]),
    ).resolves.toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('skips invalid or missing prices and keeps valid ones', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        { symbol: 'BTCUSDT', price: '0' },
        { symbol: 'ETHUSDT', price: '-1' },
        { symbol: 'SOLUSDT', price: 'NaN' },
        { symbol: 'XRPUSDT', price: '0.5' },
      ]),
    )
    const provider = createBinanceProvider({ fetchImpl, now: () => NOW })

    const prices = await provider.fetchPrices([
      ref({ symbol: 'BTC', binanceSymbol: 'BTCUSDT' }),
      ref({ symbol: 'ETH', binanceSymbol: 'ETHUSDT' }),
      ref({ symbol: 'SOL', binanceSymbol: 'SOLUSDT' }),
      ref({ symbol: 'XRP', binanceSymbol: 'XRPUSDT' }),
    ])

    expect(prices).toHaveLength(1)
    expect(prices[0]?.symbol).toBe('XRP')
    expect(prices[0]?.price).toBe(0.5)
  })

  it('rejects a malformed response as invalid', async () => {
    const provider = createBinanceProvider({
      fetchImpl: vi.fn(async () => jsonResponse({ not: 'an array' })),
    })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', binanceSymbol: 'BTCUSDT' })]),
    ).rejects.toMatchObject({ kind: 'invalid', provider: 'binance' })
  })

  it.each([
    [429, 'rate-limit'],
    [451, 'blocked'],
    [403, 'blocked'],
    [400, 'invalid'],
    [500, 'network'],
  ])('maps HTTP %s to %s', async (status, kind) => {
    const provider = createBinanceProvider({
      fetchImpl: vi.fn(async () => new Response('', { status })),
    })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', binanceSymbol: 'BTCUSDT' })]),
    ).rejects.toMatchObject({ kind, provider: 'binance' })
  })

  it('maps a network failure to a network ProviderError', async () => {
    const provider = createBinanceProvider({
      fetchImpl: vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', binanceSymbol: 'BTCUSDT' })]),
    ).rejects.toBeInstanceOf(ProviderError)
  })

  it('rethrows an abort error instead of wrapping it', async () => {
    const provider = createBinanceProvider({
      fetchImpl: vi.fn(async () => {
        throw new DOMException('aborted', 'AbortError')
      }),
    })

    await expect(
      provider.fetchPrices([ref({ symbol: 'BTC', binanceSymbol: 'BTCUSDT' })]),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('binance.fetchSymbols', () => {
  it('keeps trading symbols and prefers USDT quotes', async () => {
    const provider = createBinanceProvider({
      fetchImpl: vi.fn(async () =>
        jsonResponse({
          symbols: [
            { symbol: 'BTCUSDC', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDC' },
            { symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT' },
            { symbol: 'OLDUSDT', status: 'BREAK', baseAsset: 'OLD', quoteAsset: 'USDT' },
          ],
        }),
      ),
    })

    const symbols = await provider.fetchSymbols()

    expect(symbols.map((row) => row.symbol)).toEqual(['BTCUSDT', 'BTCUSDC'])
    expect(symbols[0]).toMatchObject({
      provider: 'binance',
      symbol: 'BTCUSDT',
      name: null,
      quote: 'USDT',
      rank: null,
    })
  })

  it('rejects a malformed exchange info response', async () => {
    const provider = createBinanceProvider({
      fetchImpl: vi.fn(async () => jsonResponse({ symbols: 'nope' })),
    })

    await expect(provider.fetchSymbols()).rejects.toMatchObject({
      kind: 'invalid',
      provider: 'binance',
    })
  })
})
