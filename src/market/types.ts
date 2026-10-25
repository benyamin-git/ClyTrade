import type { PriceProviderId } from '@/data/models/price'

export interface MarketRef {
  key: string
  symbol: string
  binanceSymbol: string | null
  coingeckoId: string | null
}

export interface ProviderPrice {
  key: string
  symbol: string
  provider: PriceProviderId
  price: number
  fetchedAt: number
  sourceTimestamp: number | null
}

export interface ProviderSymbol {
  provider: PriceProviderId
  priceId: string
  symbol: string
  name: string | null
  quote: string | null
  rank: number | null
}

export interface MarketProvider {
  id: PriceProviderId
  fetchPrices(refs: MarketRef[], signal?: AbortSignal): Promise<ProviderPrice[]>
  fetchSymbols(): Promise<ProviderSymbol[]>
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export const STALE_MS = 15 * 60_000

export function priceKeyFor(
  ref: Pick<MarketRef, 'symbol' | 'binanceSymbol' | 'coingeckoId'>,
): string {
  if (ref.binanceSymbol) return `binance:${ref.binanceSymbol}`
  if (ref.coingeckoId) return `coingecko:${ref.coingeckoId}`
  return `symbol:${ref.symbol.trim().toUpperCase()}`
}
