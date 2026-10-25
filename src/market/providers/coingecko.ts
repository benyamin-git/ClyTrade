import type { PriceProviderId } from '@/data/models/price'
import type { FetchLike, MarketProvider, MarketRef, ProviderPrice, ProviderSymbol } from '../types'
import { ProviderError, errorFromResponse, isAbortError } from './errors'

const BASE_URL = 'https://api.coingecko.com/api/v3'
const PROVIDER: PriceProviderId = 'coingecko'

export interface CoinGeckoOptions {
  apiKey?: string | null
  fetchImpl?: FetchLike
  now?: () => number
}

export function createCoinGeckoProvider(options: CoinGeckoOptions = {}): MarketProvider {
  const apiKey = options.apiKey?.trim() || null
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? Date.now

  async function request(url: string, signal?: AbortSignal): Promise<Response> {
    let response: Response
    try {
      response = await fetchImpl(url, {
        ...(signal ? { signal } : {}),
        headers: apiKey ? { 'x-cg-demo-api-key': apiKey } : undefined,
      })
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
      const byCoinId = new Map<string, MarketRef>()
      for (const ref of refs) {
        if (ref.coingeckoId) {
          byCoinId.set(ref.coingeckoId, ref)
        }
      }
      if (byCoinId.size === 0) return []

      const ids = [...byCoinId.keys()]
      const query = encodeURIComponent(ids.join(','))
      const response = await request(
        `${BASE_URL}/simple/price?ids=${query}&vs_currencies=usd`,
        signal,
      )
      const payload = await readJson(response)
      if (!isRecord(payload)) {
        throw new ProviderError('invalid', PROVIDER, 'expected a price object')
      }

      const fetchedAt = now()
      const prices: ProviderPrice[] = []
      for (const [coinId, ref] of byCoinId) {
        const row = payload[coinId]
        if (!isRecord(row)) continue
        const price = row.usd
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue
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
      const [listResponse, marketsResponse] = await Promise.all([
        request(`${BASE_URL}/coins/list`),
        request(`${BASE_URL}/coins/markets?vs_currency=usd&per_page=250&page=1`),
      ])
      const [list, markets] = await Promise.all([readJson(listResponse), readJson(marketsResponse)])
      if (!Array.isArray(list) || !Array.isArray(markets)) {
        throw new ProviderError('invalid', PROVIDER, 'expected coin lists')
      }

      const ranks = new Map<string, number>()
      for (const item of markets) {
        if (!isRecord(item)) continue
        if (typeof item.id !== 'string') continue
        if (typeof item.market_cap_rank !== 'number' || !Number.isInteger(item.market_cap_rank)) {
          continue
        }
        ranks.set(item.id, item.market_cap_rank)
      }

      const symbols: ProviderSymbol[] = []
      for (const item of list) {
        if (!isRecord(item)) continue
        if (typeof item.id !== 'string' || typeof item.symbol !== 'string') continue
        if (typeof item.name !== 'string') continue
        symbols.push({
          provider: PROVIDER,
          priceId: item.id,
          symbol: item.symbol.toUpperCase(),
          name: item.name,
          quote: null,
          rank: ranks.get(item.id) ?? null,
        })
      }
      return symbols.sort(
        (left, right) =>
          (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY) ||
          left.symbol.localeCompare(right.symbol),
      )
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
