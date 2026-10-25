import type { Asset } from '@/data/models/asset'
import type { ProviderPrice } from '@/market/types'

export function shouldWriteAutoPrice(
  asset: Asset,
  price: ProviderPrice | undefined,
  now: number,
  staleMs: number,
): boolean {
  if (asset.market !== 'crypto' || !asset.autoPrice) return false
  if (price === undefined) return false
  if (now - price.fetchedAt >= staleMs) return false
  return price.price !== asset.currentPrice
}
