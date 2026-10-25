import type { MarketProvider } from '../types'
import { createBinanceProvider } from './binance'
import { createCoinGeckoProvider } from './coingecko'

export function createMarketProviders(apiKey: string | null = null): MarketProvider[] {
  return [createBinanceProvider(), createCoinGeckoProvider({ apiKey })]
}
