import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { PriceProviderChoice } from '@/data/models/price'
import { getMarketApiKey, getPreferences } from '@/data/repositories/settings.repo'
import { createMarketProviders } from './providers'
import {
  createPriceScheduler,
  type PriceRequestReason,
  type PriceScheduler,
  type SchedulerStatus,
} from './scheduler'
import type { MarketRef, ProviderPrice } from './types'

export interface UsePricesResult {
  prices: ReadonlyMap<string, ProviderPrice>
  status: SchedulerStatus
  refresh: () => Promise<void>
}

interface SharedScheduler {
  scheduler: PriceScheduler
  consumers: number
}

const sharedSchedulers = new Map<string, SharedScheduler>()
const EMPTY_PRICES: ReadonlyMap<string, ProviderPrice> = new Map()

function schedulerKey(providerChoice: PriceProviderChoice, apiKey: string | null): string {
  return `${providerChoice}|${apiKey ?? ''}`
}

function acquireScheduler(
  providerChoice: PriceProviderChoice,
  apiKey: string | null,
): PriceScheduler {
  const key = schedulerKey(providerChoice, apiKey)
  const existing = sharedSchedulers.get(key)
  if (existing) {
    existing.consumers += 1
    return existing.scheduler
  }

  const scheduler = createPriceScheduler({
    providers: createMarketProviders(apiKey),
    providerChoice,
    coingeckoKey: apiKey,
  })
  sharedSchedulers.set(key, { scheduler, consumers: 1 })
  return scheduler
}

function releaseScheduler(providerChoice: PriceProviderChoice, apiKey: string | null): void {
  const key = schedulerKey(providerChoice, apiKey)
  const entry = sharedSchedulers.get(key)
  if (!entry) return
  entry.consumers -= 1
  if (entry.consumers > 0) return
  entry.scheduler.dispose()
  sharedSchedulers.delete(key)
}

function toPriceMap(prices: readonly ProviderPrice[]): ReadonlyMap<string, ProviderPrice> {
  return new Map(prices.map((price) => [price.key, price]))
}

function serializeRefs(refs: readonly MarketRef[]): string {
  return JSON.stringify(
    refs.map((ref) => [ref.key, ref.symbol, ref.binanceSymbol, ref.coingeckoId]),
  )
}

export function usePrices(refs: readonly MarketRef[], reason: PriceRequestReason): UsePricesResult {
  const stored = useLiveQuery(
    async () => ({
      preferences: await getPreferences(),
      apiKey: await getMarketApiKey(),
    }),
    [],
  )
  const ready = stored !== undefined
  const providerChoice = stored?.preferences.priceProvider ?? 'auto'
  const apiKey = stored?.apiKey ?? null

  const [prices, setPrices] = useState<ReadonlyMap<string, ProviderPrice>>(EMPTY_PRICES)
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const schedulerRef = useRef<PriceScheduler | null>(null)
  const refsRef = useRef(refs)

  const refsKey = useMemo(() => serializeRefs(refs), [refs])
  const fallbackStatus = useMemo<SchedulerStatus>(
    () => ({
      provider: providerChoice,
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt: null,
      error: null,
    }),
    [providerChoice],
  )

  useEffect(() => {
    refsRef.current = refs
  }, [refs])

  useEffect(() => {
    if (!ready) return
    const scheduler = acquireScheduler(providerChoice, apiKey)
    schedulerRef.current = scheduler
    const unsubscribe = scheduler.subscribe(setSchedulerStatus)
    return () => {
      unsubscribe()
      schedulerRef.current = null
      releaseScheduler(providerChoice, apiKey)
    }
  }, [ready, providerChoice, apiKey])

  useEffect(() => {
    const scheduler = schedulerRef.current
    if (!ready || !scheduler || refsKey === '[]') return

    let cancelled = false
    void scheduler
      .request(refsRef.current, reason)
      .then((result) => {
        if (!cancelled) setPrices(toPriceMap(result))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [ready, providerChoice, apiKey, refsKey, reason])

  const refresh = useCallback(async () => {
    const scheduler = schedulerRef.current
    if (!scheduler) return
    const result = await scheduler.refreshNow(refsRef.current).catch(() => null)
    if (result) setPrices(toPriceMap(result))
  }, [])

  return {
    prices,
    status: schedulerStatus ?? fallbackStatus,
    refresh,
  }
}
