import { useEffect, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAssets, updateAsset } from '@/data/repositories/assets.repo'
import { usePrices } from '@/market/usePrices'
import { STALE_MS, priceKeyFor, type MarketRef } from '@/market/types'
import { shouldWriteAutoPrice } from './autoPrice'

export function useAutoPriceSync(): void {
  const assets = useLiveQuery(() => listAssets(), [], undefined)
  const refs = useMemo<MarketRef[]>(
    () =>
      (assets ?? [])
        .filter(
          (asset) =>
            asset.market === 'crypto' &&
            asset.autoPrice &&
            (asset.binanceSymbol !== null || asset.coingeckoId !== null),
        )
        .map((asset) => ({
          key: priceKeyFor(asset),
          symbol: asset.symbol,
          binanceSymbol: asset.binanceSymbol,
          coingeckoId: asset.coingeckoId,
        })),
    [assets],
  )
  const { prices } = usePrices(refs, 'portfolio')
  const writtenFetchedAt = useRef(new Map<string, number>())

  useEffect(() => {
    if (!assets) return
    const currentTime = Date.now()
    for (const asset of assets) {
      const price = prices.get(priceKeyFor(asset))
      if (price === undefined) continue
      if (!shouldWriteAutoPrice(asset, price, currentTime, STALE_MS)) continue
      if (writtenFetchedAt.current.get(asset.id) === price.fetchedAt) continue
      writtenFetchedAt.current.set(asset.id, price.fetchedAt)
      void updateAsset(asset.id, { currentPrice: price.price }).catch(() => undefined)
    }
  }, [assets, prices])
}
