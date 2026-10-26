import { useEffect, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAssets, updateAsset } from '@/data/repositories/assets.repo'
import { getMarketApiKey } from '@/data/repositories/settings.repo'
import { listTrades, updateTrade } from '@/data/repositories/trades.repo'
import { createMarketProviders } from './providers'
import { pickPreferredCandidate, resolveSymbol } from './symbols'

interface PendingMapping {
  key: string
  kind: 'asset' | 'trade'
  id: string
  symbol: string
}

export function useSymbolMappingSync(): void {
  const apiKey = useLiveQuery(() => getMarketApiKey(), [])
  const assets = useLiveQuery(() => listAssets(), [])
  const trades = useLiveQuery(() => listTrades(), [])
  const providers = useMemo(() => createMarketProviders(apiKey ?? null), [apiKey])
  const attempted = useRef(new Set<string>())
  const running = useRef(false)

  useEffect(() => {
    if (running.current) return

    const pending: PendingMapping[] = []
    for (const asset of assets ?? []) {
      if (asset.market !== 'crypto' || !asset.autoPrice) continue
      if (asset.binanceSymbol !== null || asset.coingeckoId !== null) continue
      const key = `asset:${asset.id}:${asset.symbol.trim().toUpperCase()}`
      if (!attempted.current.has(key)) {
        pending.push({ key, kind: 'asset', id: asset.id, symbol: asset.symbol })
      }
    }
    for (const trade of trades ?? []) {
      if (trade.market !== 'crypto' || trade.status !== 'open') continue
      if (trade.targetPrice === null && trade.stopPrice === null) continue
      if (trade.binanceSymbol !== null || trade.coingeckoId !== null) continue
      const key = `trade:${trade.id}:${trade.symbol.trim().toUpperCase()}`
      if (!attempted.current.has(key)) {
        pending.push({ key, kind: 'trade', id: trade.id, symbol: trade.symbol })
      }
    }
    if (pending.length === 0) return

    running.current = true
    void (async () => {
      try {
        for (const item of pending) {
          attempted.current.add(item.key)
          const candidates = await resolveSymbol(item.symbol, providers).catch(() => [])
          const preferred = pickPreferredCandidate(candidates)
          if (preferred === null) continue
          if (preferred.binanceSymbol === null && preferred.coingeckoId === null) continue
          const patch = {
            binanceSymbol: preferred.binanceSymbol,
            coingeckoId: preferred.coingeckoId,
          }
          if (item.kind === 'asset') {
            await updateAsset(item.id, patch).catch(() => undefined)
          } else {
            await updateTrade(item.id, patch).catch(() => undefined)
          }
        }
      } finally {
        running.current = false
      }
    })()
  }, [assets, trades, providers])
}
