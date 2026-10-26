import { useEffect, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Asset } from '@/data/models/asset'
import type { PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { listAlertEvents, listAlerts } from '@/data/repositories/alerts.repo'
import { listAssets } from '@/data/repositories/assets.repo'
import { listTrades } from '@/data/repositories/trades.repo'
import { useI18n } from '@/i18n/I18nContext'
import { runAlertEvaluation } from '@/market/engine'
import { priceKeyFor, type MarketRef } from '@/market/types'
import { usePrices } from '@/market/usePrices'
import { buildAutoCloseNote } from './autoCloseNote'
import { buildGroupedNotification, showNotification } from './notifications'
import { waitForNativeImport } from './useBackgroundSync'

interface ForegroundData {
  trades: Trade[]
  rules: PriceAlert[]
  assets: Asset[]
}

function addRef(byKey: Map<string, MarketRef>, ref: MarketRef): void {
  const existing = byKey.get(ref.key)
  if (!existing) {
    byKey.set(ref.key, ref)
    return
  }
  byKey.set(ref.key, {
    ...existing,
    binanceSymbol: existing.binanceSymbol ?? ref.binanceSymbol,
    coingeckoId: existing.coingeckoId ?? ref.coingeckoId,
  })
}

function buildRefs(data: ForegroundData | undefined): MarketRef[] {
  if (!data) return []
  const byKey = new Map<string, MarketRef>()

  for (const trade of data.trades) {
    if (trade.market !== 'crypto') continue
    if (trade.status !== 'open') continue
    if (trade.targetPrice === null && trade.stopPrice === null) continue
    if (trade.binanceSymbol === null && trade.coingeckoId === null) continue
    addRef(byKey, {
      key: priceKeyFor(trade),
      symbol: trade.symbol,
      binanceSymbol: trade.binanceSymbol,
      coingeckoId: trade.coingeckoId,
    })
  }

  for (const rule of data.rules) {
    if (!rule.enabled) continue
    if (rule.binanceSymbol === null && rule.coingeckoId === null) continue
    addRef(byKey, {
      key: priceKeyFor(rule),
      symbol: rule.symbol,
      binanceSymbol: rule.binanceSymbol,
      coingeckoId: rule.coingeckoId,
    })
  }

  for (const asset of data.assets) {
    if (asset.market !== 'crypto' || !asset.autoPrice) continue
    if (asset.binanceSymbol === null && asset.coingeckoId === null) continue
    addRef(byKey, {
      key: priceKeyFor(asset),
      symbol: asset.symbol,
      binanceSymbol: asset.binanceSymbol,
      coingeckoId: asset.coingeckoId,
    })
  }

  return [...byKey.values()]
}

export function useForegroundAlerts(): void {
  const { t } = useI18n()
  const stored = useLiveQuery<ForegroundData>(
    async () => ({
      trades: await listTrades(),
      rules: await listAlerts(),
      assets: await listAssets(),
    }),
    [],
  )
  const refs = useMemo(() => buildRefs(stored), [stored])
  const { prices } = usePrices(refs, 'timer')
  const runningRef = useRef(false)
  const tRef = useRef(t)

  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    if (prices.size === 0 || runningRef.current) return
    runningRef.current = true

    void (async () => {
      try {
        await waitForNativeImport()
        const before = new Set((await listAlertEvents()).map((event) => event.id))
        await runAlertEvaluation({
          note: (input) => buildAutoCloseNote(tRef.current, input),
        })

        const created = (await listAlertEvents()).filter(
          (event) => event.status === 'unread' && !before.has(event.id),
        )
        if (created.length === 0) return

        const payload = buildGroupedNotification(created, tRef.current)
        if (payload) await showNotification(payload)
      } catch {
        return
      } finally {
        runningRef.current = false
      }
    })()
  }, [prices])
}
