import type { PriceCacheEntry, PriceProviderChoice, PriceProviderId } from '@/data/models/price'
import { COINGECKO_MONTHLY_LIMIT, type MarketUsage } from '@/data/models/settings'
import { getPriceCache, putPriceCache } from '@/data/repositories/prices.repo'
import { getMarketUsage, recordMarketUsage } from '@/data/repositories/settings.repo'
import { createTokenBucket, type BudgetConfig, type TokenBucket } from './budget'
import { ProviderError } from './providers/errors'
import type { MarketProvider, MarketRef, ProviderPrice } from './types'

const FIVE_MINUTES = 5 * 60_000
const THIRTY_SECONDS = 30_000
const SIXTY_SECONDS = 60_000
const DEFAULT_FETCH_TIMEOUT_MS = 15_000

const TTL: Record<PriceRequestReason, number> = {
  portfolio: FIVE_MINUTES,
  journal: FIVE_MINUTES,
  alerts: FIVE_MINUTES,
  timer: FIVE_MINUTES,
  detail: THIRTY_SECONDS,
  manual: SIXTY_SECONDS,
}

const DEFAULT_BUDGETS: Record<PriceProviderId, BudgetConfig> = {
  binance: { maxRequestsPerMinute: 60, maxWeightPerMinute: 1200, minSpacingMs: 1_000 },
  coingecko: { maxRequestsPerMinute: 6, maxWeightPerMinute: 6, minSpacingMs: 10_000 },
}

export type PriceRequestReason = 'portfolio' | 'journal' | 'detail' | 'timer' | 'manual' | 'alerts'

export interface MonthlyUsageStatus {
  used: number
  limit: number
}

export interface SchedulerStatus {
  provider: PriceProviderChoice
  activeProvider: PriceProviderId | null
  lastSuccessAt: number | null
  nextAllowedAt: number | null
  error: string | null
  monthlyUsage: MonthlyUsageStatus | null
}

export interface PriceScheduler {
  request(refs: readonly MarketRef[], reason: PriceRequestReason): Promise<ProviderPrice[]>
  refreshNow(refs: readonly MarketRef[]): Promise<ProviderPrice[]>
  getStatus(): SchedulerStatus
  subscribe(listener: (status: SchedulerStatus) => void): () => void
  dispose(): void
}

export interface SchedulerOptions {
  providers: readonly MarketProvider[]
  providerChoice: PriceProviderChoice
  coingeckoKey?: string | null
  now?: () => number
  readCache?: (key: string) => Promise<PriceCacheEntry | undefined>
  writeCache?: (entries: readonly PriceCacheEntry[]) => Promise<void>
  budgets?: Partial<Record<PriceProviderId, BudgetConfig>>
  random?: () => number
  fetchTimeoutMs?: number
  readUsage?: (now: number) => Promise<MarketUsage>
  recordUsage?: (count: number, now: number) => Promise<MarketUsage>
}

export function createPriceScheduler(options: SchedulerOptions): PriceScheduler {
  const now = options.now ?? Date.now
  const random = options.random ?? Math.random
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const readCache = options.readCache ?? getPriceCache
  const writeCache =
    options.writeCache ?? ((entries: readonly PriceCacheEntry[]) => putPriceCache([...entries]))
  const readUsage = options.readUsage ?? getMarketUsage
  const recordUsage = options.recordUsage ?? recordMarketUsage

  const providerMap = new Map(options.providers.map((provider) => [provider.id, provider]))
  const order: PriceProviderId[] =
    options.providerChoice === 'auto'
      ? (['binance', 'coingecko'] as const).filter((id) => providerMap.has(id))
      : providerMap.has(options.providerChoice)
        ? [options.providerChoice]
        : []

  const buckets = new Map<PriceProviderId, TokenBucket>()
  for (const id of order) {
    buckets.set(
      id,
      createTokenBucket(options.budgets?.[id] ?? defaultBudget(id, options.coingeckoKey)),
    )
  }

  const inFlight = new Map<PriceProviderId, Promise<ProviderPrice[]>>()
  const failures = new Map<PriceProviderId, number>()
  const unavailableUntil = new Map<PriceProviderId, number>()
  const lastErrors = new Map<PriceProviderId, ProviderError>()
  const listeners = new Set<(status: SchedulerStatus) => void>()

  let disposed = false
  let lastManualAt: number | null = null
  let usage: MarketUsage | null = null
  let status: SchedulerStatus = {
    provider: options.providerChoice,
    activeProvider: null,
    lastSuccessAt: null,
    nextAllowedAt: null,
    error: null,
    monthlyUsage: null,
  }

  function monthlyUsageStatus(): MonthlyUsageStatus | null {
    if (usage === null) return null
    return { used: usage.coingeckoRequests, limit: COINGECKO_MONTHLY_LIMIT }
  }

  function emit(patch: Partial<SchedulerStatus>): void {
    status = { ...status, ...patch }
    const snapshot = status
    for (const listener of listeners) {
      listener(snapshot)
    }
  }

  function nextAllowedAt(current: number): number | null {
    let next: number | null = null
    for (const id of order) {
      const bucket = buckets.get(id)
      if (!bucket) continue
      const candidate = Math.max(bucket.nextAvailableAt(1, current), unavailableUntil.get(id) ?? 0)
      next = next === null ? candidate : Math.min(next, candidate)
    }
    return next
  }

  async function readCached(refs: readonly MarketRef[]): Promise<Map<string, PriceCacheEntry>> {
    const entries = await Promise.all(
      refs.map(async (ref) => [ref.key, await readCache(ref.key)] as const),
    )
    const result = new Map<string, PriceCacheEntry>()
    for (const [key, entry] of entries) {
      if (entry) result.set(key, entry)
    }
    return result
  }

  function isFresh(entry: PriceCacheEntry | undefined, current: number, ttl: number): boolean {
    return entry !== undefined && current - entry.fetchedAt < ttl
  }

  async function fetchWithProvider(
    provider: MarketProvider,
    refs: readonly MarketRef[],
  ): Promise<ProviderPrice[]> {
    const existing = inFlight.get(provider.id)
    if (existing) {
      const first = await existing
      const covered = new Set(first.map((price) => price.key))
      const missing = refs.filter((ref) => !covered.has(ref.key))
      if (missing.length === 0) return first
      return [...first, ...(await fetchWithProvider(provider, missing))]
    }

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | null = null
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new ProviderError('network', provider.id, 'request timed out'))
      }, fetchTimeoutMs)
    })
    const promise = Promise.race([provider.fetchPrices([...refs], controller.signal), timeout])
    inFlight.set(provider.id, promise)
    try {
      return await promise
    } finally {
      if (timer !== null) clearTimeout(timer)
      if (inFlight.get(provider.id) === promise) {
        inFlight.delete(provider.id)
      }
    }
  }

  async function run(
    refs: readonly MarketRef[],
    reason: PriceRequestReason,
    force: boolean,
  ): Promise<ProviderPrice[]> {
    if (disposed) throw new Error('scheduler disposed')

    const current = now()
    if (options.coingeckoKey && usage === null) {
      usage = await readUsage(current).catch(() => null)
      emit({ monthlyUsage: monthlyUsageStatus() })
    }
    const cached = await readCached(refs)
    const ttl = TTL[reason]
    let needed = refs.filter((ref) => force || !isFresh(cached.get(ref.key), current, ttl))
    needed = needed.filter((ref) => ref.binanceSymbol !== null || ref.coingeckoId !== null)

    if (needed.length === 0) {
      emit({ error: null, nextAllowedAt: nextAllowedAt(current) })
      return [...cached.values()]
    }

    let budgetBlocked = false
    let monthlyBlocked = false
    let servedProvider: PriceProviderId | null = null
    let servedAt: number | null = null
    const covered = new Set<string>()
    const errors: ProviderError[] = []

    for (const id of order) {
      const provider = providerMap.get(id)
      if (!provider) continue

      const providerNeeded = providerRefs(needed, id)
      if (providerNeeded.length === 0) continue

      const unavailable = unavailableUntil.get(id) ?? 0
      if (current < unavailable) {
        const last = lastErrors.get(id)
        if (last) errors.push(last)
        continue
      }

      const bucket = buckets.get(id)
      if (!bucket) continue
      const weight = requestWeight(id, providerNeeded.length)

      if (id === 'coingecko' && options.coingeckoKey) {
        if (usage === null) {
          usage = await readUsage(current).catch(() => null)
          emit({ monthlyUsage: monthlyUsageStatus() })
        }
        if (usage !== null && usage.coingeckoRequests + weight > COINGECKO_MONTHLY_LIMIT) {
          monthlyBlocked = true
          continue
        }
      }

      if (!inFlight.has(id)) {
        if (!bucket.canSpend(weight, current)) {
          budgetBlocked = true
          continue
        }
        bucket.spend(weight, current)
        if (id === 'coingecko' && options.coingeckoKey) {
          const next = await recordUsage(weight, current).catch(() => null)
          usage =
            next ??
            (usage === null
              ? null
              : { ...usage, coingeckoRequests: usage.coingeckoRequests + weight })
          emit({ monthlyUsage: monthlyUsageStatus() })
        }
      }

      try {
        const fetched = await fetchWithProvider(provider, providerNeeded)
        failures.delete(id)
        unavailableUntil.delete(id)
        lastErrors.delete(id)
        if (fetched.length > 0) {
          const entries = fetched.map(toCacheEntry)
          await writeCache(entries)
          for (const entry of entries) {
            cached.set(entry.key, entry)
            covered.add(entry.key)
          }
          servedProvider = id
          servedAt = now()
        }

        needed = needed.filter((ref) => !covered.has(ref.key))
        if (needed.length === 0) {
          const finishedAt = now()
          emit({
            activeProvider: id,
            lastSuccessAt: finishedAt,
            error: null,
            nextAllowedAt: nextAllowedAt(finishedAt),
          })
          return [...cached.values()]
        }
      } catch (cause) {
        const error = toProviderError(cause, id)
        errors.push(error)
        lastErrors.set(id, error)
        const failureCount = (failures.get(id) ?? 0) + 1
        failures.set(id, failureCount)
        unavailableUntil.set(id, now() + backoffDelay(failureCount, random))
        emit({
          activeProvider: null,
          error: error.kind,
          nextAllowedAt: nextAllowedAt(now()),
        })
        if (options.providerChoice !== 'auto') {
          throw error
        }
      }
    }

    if (options.providerChoice !== 'auto' && errors.length > 0 && !budgetBlocked) {
      throw errors[errors.length - 1]
    }

    if (monthlyBlocked && !budgetBlocked && errors.length === 0) {
      emit({ error: 'budget', nextAllowedAt: nextMonthAt(current) })
    } else if (budgetBlocked) {
      emit({ error: 'budget', nextAllowedAt: nextAllowedAt(current) })
    } else if (errors.length > 0) {
      emit({
        error: errors[errors.length - 1]?.kind ?? 'network',
        nextAllowedAt: nextAllowedAt(current),
      })
    } else if (needed.length > 0) {
      emit({
        activeProvider: servedProvider,
        lastSuccessAt: servedAt,
        error: 'invalid',
        nextAllowedAt: nextAllowedAt(now()),
      })
    }
    return [...cached.values()]
  }

  return {
    request(refs, reason) {
      return run(dedupe(refs), reason, false)
    },

    async refreshNow(refs) {
      const unique = dedupe(refs)
      if (unique.length === 0) return []
      const current = now()
      if (lastManualAt !== null && current - lastManualAt < SIXTY_SECONDS) {
        const cached = await readCached(unique)
        emit({
          error: 'manual-cooldown',
          nextAllowedAt: lastManualAt + SIXTY_SECONDS,
        })
        return [...cached.values()]
      }
      lastManualAt = current
      return run(unique, 'manual', true)
    },

    getStatus() {
      return { ...status }
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    dispose() {
      disposed = true
      listeners.clear()
    },
  }
}

function providerRefs(refs: readonly MarketRef[], provider: PriceProviderId): MarketRef[] {
  if (provider === 'binance') return refs.filter((ref) => ref.binanceSymbol !== null)
  return refs.filter((ref) => ref.coingeckoId !== null)
}

function requestWeight(provider: PriceProviderId, count: number): number {
  if (provider !== 'binance') return 1
  if (count <= 20) return 2
  if (count <= 100) return 4
  if (count <= 500) return 10
  return 20
}

function nextMonthAt(now: number): number {
  const date = new Date(now)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
}

function dedupe(refs: readonly MarketRef[]): MarketRef[] {
  const byKey = new Map<string, MarketRef>()
  for (const ref of refs) {
    if (!byKey.has(ref.key)) byKey.set(ref.key, ref)
  }
  return [...byKey.values()]
}

function toCacheEntry(price: ProviderPrice): PriceCacheEntry {
  return {
    key: price.key,
    symbol: price.symbol,
    provider: price.provider,
    price: price.price,
    fetchedAt: price.fetchedAt,
    sourceTimestamp: price.sourceTimestamp,
  }
}

function toProviderError(error: unknown, provider: PriceProviderId): ProviderError {
  if (error instanceof ProviderError) return error
  return new ProviderError(
    'network',
    provider,
    error instanceof Error ? error.message : 'request failed',
  )
}

function backoffDelay(failureCount: number, random: () => number): number {
  const steps = [30_000, 60_000, 120_000, 300_000, 900_000]
  const base = steps[Math.min(failureCount - 1, steps.length - 1)] ?? 900_000
  const jitter = 0.8 + random() * 0.4
  return Math.round(base * jitter)
}

function defaultBudget(id: PriceProviderId, coingeckoKey: string | null | undefined): BudgetConfig {
  if (id === 'binance') return DEFAULT_BUDGETS.binance
  if (coingeckoKey) {
    return { maxRequestsPerMinute: 30, maxWeightPerMinute: 30, minSpacingMs: 2_000 }
  }
  return DEFAULT_BUDGETS.coingecko
}
