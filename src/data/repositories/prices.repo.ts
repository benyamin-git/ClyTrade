import { db } from '../db'
import {
  marketSymbolSchema,
  priceCacheEntrySchema,
  type MarketSymbol,
  type PriceCacheEntry,
  type PriceProviderId,
} from '../models/price'

export async function getPriceCache(key: string): Promise<PriceCacheEntry | undefined> {
  return db.priceCache.get(key)
}

export async function listPriceCache(): Promise<PriceCacheEntry[]> {
  return db.priceCache.orderBy('key').toArray()
}

export async function putPriceCache(entries: PriceCacheEntry[]): Promise<void> {
  const parsed = entries.map((entry) => priceCacheEntrySchema.parse(entry))
  await db.priceCache.bulkPut(parsed)
}

export async function clearPriceCache(): Promise<void> {
  await db.priceCache.clear()
}

export async function listMarketSymbols(provider: PriceProviderId): Promise<MarketSymbol[]> {
  const rows = await db.marketSymbols.where('provider').equals(provider).toArray()
  return rows.sort(
    (left, right) =>
      (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY) ||
      left.symbol.localeCompare(right.symbol),
  )
}

export async function replaceMarketSymbols(
  provider: PriceProviderId,
  rows: MarketSymbol[],
): Promise<void> {
  const parsed = rows
    .filter((row) => row.provider === provider)
    .map((row) => marketSymbolSchema.parse(row))
  await db.transaction('rw', db.marketSymbols, async () => {
    await db.marketSymbols.where('provider').equals(provider).delete()
    if (parsed.length > 0) {
      await db.marketSymbols.bulkAdd(parsed)
    }
  })
}

export async function clearMarketSymbols(): Promise<void> {
  await db.marketSymbols.clear()
}
