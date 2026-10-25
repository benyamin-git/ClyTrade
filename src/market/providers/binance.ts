import type { PriceProviderId } from '@/data/models/price'
import type { FetchLike, MarketProvider, MarketRef, ProviderPrice, ProviderSymbol } from '../types'
import { ProviderError, errorFromResponse, isAbortError } from './errors'

const BASE_URL = 'https://api.binance.com'
const PROVIDER: PriceProviderId = 'binance'
const USDT_QUOTES = new Set(['USDT', 'USDC', 'FDUSD', 'BUSD', 'TUSD'])

export interface BinanceOptions {
  fetchImpl?: FetchLike
  now?: () => number
}

export function createBinanceProvider(options: BinanceOptions = {}): MarketProvider {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? Date.now

  async function request(url: string, signal?: AbortSignal): Promise<Response> {
    let response: Response
    try {
      response = await fetchImpl(url, signal ? { signal } : undefined)
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new ProviderError('network', PROVIDER, 'request failed')
    }
    if (!response.ok) {
      throw errorFromResponse(PROVIDER, response.status)
    }
    return response
  }

  async function readJson(response: Response): Promise<unknown> {
    try {
      return (await response.json()) as unknown
    } catch {
      throw new ProviderError('invalid', PROVIDER, 'invalid JSON')
    }
  }

  return {
    id: PROVIDER,

    async fetchPrices(refs: MarketRef[], signal?: AbortSignal): Promise<ProviderPrice[]> {
      const byBinanceSymbol = new Map<string, MarketRef>()
      for (const ref of refs) {
        if (ref.binanceSymbol) {
          byBinanceSymbol.set(ref.binanceSymbol, ref)
        }
      }
      if (byBinanceSymbol.size === 0) return []

      const symbols = [...byBinanceSymbol.keys()]
      const query = encodeURIComponent(JSON.stringify(symbols))
      const response = await request(`${BASE_URL}/api/v3/ticker/price?symbols=${query}`, signal)
      const payload = await readJson(response)
      if (!Array.isArray(payload)) {
        throw new ProviderError('invalid', PROVIDER, 'expected a price array')
      }

      const fetchedAt = now()
      const prices: ProviderPrice[] = []
      for (const item of payload) {
        if (item === null || typeof item !== 'object') continue
        const row = item as { symbol?: unknown; price?: unknown }
        if (typeof row.symbol !== 'string') continue
        const ref = byBinanceSymbol.get(row.symbol)
        if (!ref) continue
        const price =
          typeof row.price === 'number'
            ? row.price
            : typeof row.price === 'string'
              ? Number(row.price)
              : Number.NaN
        if (!Number.isFinite(price) || price <= 0) continue
        prices.push({
          key: ref.key,
          symbol: ref.symbol,
          provider: PROVIDER,
          price,
          fetchedAt,
          sourceTimestamp: null,
        })
      }
      return prices
    },

    async fetchSymbols(): Promise<ProviderSymbol[]> {
      const response = await request(`${BASE_URL}/api/v3/exchangeInfo`)
      const payload = await readJson(response)
      if (payload === null || typeof payload !== 'object') {
        throw new ProviderError('invalid', PROVIDER, 'expected exchange info')
      }
      const rows = (payload as { symbols?: unknown }).symbols
      if (!Array.isArray(rows)) {
        throw new ProviderError('invalid', PROVIDER, 'expected a symbol list')
      }

      const symbols: ProviderSymbol[] = []
      for (const item of rows) {
        if (item === null || typeof item !== 'object') continue
        const row = item as { symbol?: unknown; status?: unknown; quoteAsset?: unknown }
        if (row.status !== 'TRADING') continue
        if (typeof row.symbol !== 'string' || typeof row.quoteAsset !== 'string') continue
        symbols.push({
          provider: PROVIDER,
          priceId: row.symbol,
          symbol: row.symbol,
          name: null,
          quote: row.quoteAsset,
          rank: null,
        })
      }
      return symbols.sort(
        (left, right) =>
          quoteRank(left.quote) - quoteRank(right.quote) || left.symbol.localeCompare(right.symbol),
      )
    },
  }
}

function quoteRank(quote: string | null): number {
  if (quote === null) return 10
  if (quote === 'USDT') return 0
  if (quote === 'USDC') return 1
  if (quote === 'FDUSD') return 2
  if (quote === 'BUSD') return 3
  if (quote === 'TUSD') return 4
  return USDT_QUOTES.has(quote) ? 5 : 10
}
