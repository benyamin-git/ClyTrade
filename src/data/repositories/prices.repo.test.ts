import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MarketSymbol, PriceCacheEntry } from '../models/price'
import {
  clearMarketSymbols,
  clearPriceCache,
  getPriceCache,
  listMarketSymbols,
  listPriceCache,
  putPriceCache,
  replaceMarketSymbols,
} from './prices.repo'

function cacheEntry(key: string, price = 100): PriceCacheEntry {
  return {
    key,
    symbol: key.split(':')[1] ?? key,
    provider: 'binance',
    price,
    fetchedAt: 1,
    sourceTimestamp: null,
  }
}

function symbol(
  provider: 'binance' | 'coingecko',
  value: string,
  rank: number | null,
): MarketSymbol {
  return {
    id: `${provider}:${value}`,
    provider,
    priceId: value,
    symbol: value,
    name: null,
    quote: provider === 'binance' ? 'USDT' : null,
    rank,
    updatedAt: 1,
  }
}

describe('price cache repository', () => {
  beforeEach(async () => {
    await clearPriceCache()
    await clearMarketSymbols()
  })

  afterEach(async () => {
    await clearPriceCache()
    await clearMarketSymbols()
  })

  it('puts, reads, lists and clears cached prices', async () => {
    await putPriceCache([cacheEntry('binance:BTCUSDT', 68000), cacheEntry('binance:ETHUSDT', 3400)])

    expect((await getPriceCache('binance:BTCUSDT'))?.price).toBe(68000)
    expect(await getPriceCache('binance:missing')).toBeUndefined()
    expect((await listPriceCache()).map((entry) => entry.key)).toEqual([
      'binance:BTCUSDT',
      'binance:ETHUSDT',
    ])

    await clearPriceCache()
    expect(await listPriceCache()).toEqual([])
  })

  it('replaces one provider symbol list without touching the other', async () => {
    await replaceMarketSymbols('binance', [symbol('binance', 'BTCUSDT', 1)])
    await replaceMarketSymbols('coingecko', [symbol('coingecko', 'bitcoin', 1)])

    await replaceMarketSymbols('binance', [symbol('binance', 'ETHUSDT', 2)])

    expect((await listMarketSymbols('binance')).map((row) => row.symbol)).toEqual(['ETHUSDT'])
    expect((await listMarketSymbols('coingecko')).map((row) => row.symbol)).toEqual(['bitcoin'])
  })

  it('orders symbols by rank with unranked rows last', async () => {
    await replaceMarketSymbols('coingecko', [
      symbol('coingecko', 'unranked', null),
      symbol('coingecko', 'second', 2),
      symbol('coingecko', 'first', 1),
    ])

    expect((await listMarketSymbols('coingecko')).map((row) => row.symbol)).toEqual([
      'first',
      'second',
      'unranked',
    ])
  })
})
