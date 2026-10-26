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
  refs: Map<string, readonly MarketRef[]>
  listeners: Set<(prices: readonly ProviderPrice[]) => void>
  timer: number | null
  visibilityListener: (() => void) | null
}

const FOREGROUND_INTERVAL_MS = 5 * 60_000
const sharedSchedulers = new Map<string, SharedScheduler>()
const EMPTY_PRICES: ReadonlyMap<string, ProviderPrice> = new Map()

let consumerSequence = 0

function createConsumerId(): string {
  consumerSequence += 1
  return `usePrices-${consumerSequence}`
}

function schedulerKey(providerChoice: PriceProviderChoice, apiKey: string | null): string {
  return `${providerChoice}|${apiKey ?? ''}`
}

function collectRefs(entry: SharedScheduler): MarketRef[] {
  const byKey = new Map<string, MarketRef>()
  for (const refs of entry.refs.values()) {
    for (const ref of refs) {
      if (!byKey.has(ref.key)) byKey.set(ref.key, ref)
    }
  }
  return [...byKey.values()]
}

function scheduleForeground(entry: SharedScheduler): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (entry.consumers === 0) return
  if (entry.timer !== null) window.clearTimeout(entry.timer)
  entry.timer = window.setTimeout(() => {
    entry.timer = null
    if (document.visibilityState !== 'visible') return
    runForeground(entry)
  }, FOREGROUND_INTERVAL_MS)
}

function runForeground(entry: SharedScheduler): void {
  if (entry.timer !== null && typeof window !== 'undefined') {
    window.clearTimeout(entry.timer)
    entry.timer = null
  }
  const refs = collectRefs(entry)
  if (refs.length === 0) {
    scheduleForeground(entry)
    return
  }
  void entry.scheduler
    .request(refs, 'timer')
    .then((prices) => {
      for (const listener of entry.listeners) listener(prices)
    })
    .catch(() => undefined)
    .finally(() => {
      scheduleForeground(entry)
    })
}

function startForeground(entry: SharedScheduler): void {
  if (typeof document === 'undefined' || entry.visibilityListener) return
  entry.visibilityListener = () => {
    if (document.visibilityState === 'visible') runForeground(entry)
  }
  document.addEventListener('visibilitychange', entry.visibilityListener)
  scheduleForeground(entry)
}

function stopForeground(entry: SharedScheduler): void {
  if (entry.timer !== null && typeof window !== 'undefined') {
    window.clearTimeout(entry.timer)
  }
  entry.timer = null
  if (entry.visibilityListener) {
    document.removeEventListener('visibilitychange', entry.visibilityListener)
    entry.visibilityListener = null
  }
}

function acquireScheduler(
  providerChoice: PriceProviderChoice,
  apiKey: string | null,
): SharedScheduler {
  const key = schedulerKey(providerChoice, apiKey)
  const existing = sharedSchedulers.get(key)
  if (existing) {
    existing.consumers += 1
    return existing
  }

  const entry: SharedScheduler = {
    scheduler: createPriceScheduler({
      providers: createMarketProviders(apiKey),
      providerChoice,
      coingeckoKey: apiKey,
    }),
    consumers: 1,
    refs: new Map(),
    listeners: new Set(),
    timer: null,
    visibilityListener: null,
  }
  sharedSchedulers.set(key, entry)
  startForeground(entry)
  return entry
}

function releaseScheduler(providerChoice: PriceProviderChoice, apiKey: string | null): void {
  const key = schedulerKey(providerChoice, apiKey)
  const entry = sharedSchedulers.get(key)
  if (!entry) return
  entry.consumers -= 1
  if (entry.consumers > 0) return
  stopForeground(entry)
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

  const [consumerId] = useState(createConsumerId)
  const [prices, setPrices] = useState<ReadonlyMap<string, ProviderPrice>>(EMPTY_PRICES)
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const entryRef = useRef<SharedScheduler | null>(null)
  const schedulableRefs = useMemo(
    () => refs.filter((ref) => ref.binanceSymbol !== null || ref.coingeckoId !== null),
    [refs],
  )
  const refsRef = useRef(schedulableRefs)

  const refsKey = useMemo(() => serializeRefs(schedulableRefs), [schedulableRefs])
  const fallbackStatus = useMemo<SchedulerStatus>(
    () => ({
      provider: providerChoice,
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt: null,
      monthlyUsage: null,
      error: null,
    }),
    [providerChoice],
  )

  useEffect(() => {
    refsRef.current = schedulableRefs
  }, [schedulableRefs])

  useEffect(() => {
    if (!ready) return
    const entry = acquireScheduler(providerChoice, apiKey)
    entryRef.current = entry
    const unsubscribe = entry.scheduler.subscribe(setSchedulerStatus)
    return () => {
      unsubscribe()
      entryRef.current = null
      releaseScheduler(providerChoice, apiKey)
    }
  }, [ready, providerChoice, apiKey])

  useEffect(() => {
    const entry = entryRef.current
    if (!entry) return
    entry.refs.set(consumerId, schedulableRefs)
    return () => {
      entry.refs.delete(consumerId)
    }
  }, [ready, providerChoice, apiKey, schedulableRefs, consumerId])

  useEffect(() => {
    const entry = entryRef.current
    if (!entry) return
    const listener = (next: readonly ProviderPrice[]) => setPrices(toPriceMap(next))
    entry.listeners.add(listener)
    return () => {
      entry.listeners.delete(listener)
    }
  }, [ready, providerChoice, apiKey])

  useEffect(() => {
    const entry = entryRef.current
    if (!ready || !entry || refsKey === '[]') return

    let cancelled = false
    void entry.scheduler
      .request(refsRef.current, reason)
      .then((result) => {
        if (cancelled) return
        setPrices(toPriceMap(result))
        scheduleForeground(entry)
      })
      .catch(() => {
        if (!cancelled) scheduleForeground(entry)
      })

    return () => {
      cancelled = true
    }
  }, [ready, providerChoice, apiKey, refsKey, reason])

  const refresh = useCallback(async () => {
    const entry = entryRef.current
    if (!entry) return
    const result = await entry.scheduler.refreshNow(refsRef.current).catch(() => null)
    if (result) setPrices(toPriceMap(result))
    scheduleForeground(entry)
  }, [])

  return {
    prices,
    status: schedulerStatus ?? fallbackStatus,
    refresh,
  }
}
