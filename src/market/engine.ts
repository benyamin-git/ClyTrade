import type { AlertEventDraft } from '@/data/models/price'
import {
  createAlertEvent,
  listAlertEvents,
  listAlerts,
  pruneAlertEvents,
  updateAlert,
} from '@/data/repositories/alerts.repo'
import { listPriceCache } from '@/data/repositories/prices.repo'
import { applyAutoClose, listTrades } from '@/data/repositories/trades.repo'
import { evaluatePrices } from './evaluate'
import { STALE_MS, type ProviderPrice } from './types'

export interface EngineOptions {
  now?: number
  note: (input: {
    symbol: string
    level: number
    reason: 'target' | 'stop'
    at: number
    price: number
  }) => string
}

export interface EvaluationSummary {
  events: number
  closes: number
  reviews: number
}

const HISTORY_LIMIT = 500

let inFlight: Promise<EvaluationSummary> | null = null

function isUnresolved(status: AlertEventDraft['status']): boolean {
  return status === 'unread' || status === 'read'
}

function dedupeKey(event: AlertEventDraft): string | null {
  const owner = event.tradeId ?? event.ruleId ?? ''
  if (event.kind === 'level' || event.kind === 'percent') return null
  if (event.kind === 'gap') {
    return `gap|${owner}|${event.targetPrice ?? ''}|${event.stopPrice ?? ''}`
  }
  if (event.kind === 'stale') {
    return `stale|${owner}|${event.price}`
  }
  return `${event.kind}|${owner}|${event.level ?? ''}`
}

function addKey(set: Set<string>, event: AlertEventDraft): void {
  const key = dedupeKey(event)
  if (key !== null) set.add(key)
}

function shouldSuppress(
  event: AlertEventDraft,
  unresolved: ReadonlySet<string>,
  dismissedReviews: ReadonlySet<string>,
): boolean {
  const key = dedupeKey(event)
  if (key === null) return false
  if (unresolved.has(key)) return true
  return (event.kind === 'gap' || event.kind === 'stale') && dismissedReviews.has(key)
}

async function evaluateAndPersist(options: EngineOptions): Promise<EvaluationSummary> {
  const now = options.now ?? Date.now()
  const [trades, rules, cache, history] = await Promise.all([
    listTrades(),
    listAlerts(),
    listPriceCache(),
    listAlertEvents(HISTORY_LIMIT),
  ])

  const openTrades = trades.filter((trade) => trade.status === 'open')
  const openById = new Map(openTrades.map((trade) => [trade.id, trade]))
  const prices = new Map<string, ProviderPrice>(
    cache.map((entry): [string, ProviderPrice] => [entry.key, entry]),
  )

  const result = evaluatePrices({
    now,
    prices,
    trades: openTrades,
    rules,
    staleMs: STALE_MS,
  })

  const unresolved = new Set<string>()
  const dismissedReviews = new Set<string>()
  for (const event of history) {
    if (isUnresolved(event.status)) {
      addKey(unresolved, event)
    } else if (event.status === 'dismissed' && (event.kind === 'gap' || event.kind === 'stale')) {
      addKey(dismissedReviews, event)
    }
  }
  let events = 0
  let reviews = 0

  for (const draft of result.events) {
    if (shouldSuppress(draft, unresolved, dismissedReviews)) continue
    addKey(unresolved, draft)
    await createAlertEvent(draft)
    events += 1
  }

  for (const draft of result.reviews) {
    if (shouldSuppress(draft, unresolved, dismissedReviews)) continue
    addKey(unresolved, draft)
    await createAlertEvent(draft)
    reviews += 1
  }

  let closes = 0
  for (const close of result.closes) {
    const trade = openById.get(close.tradeId)
    if (!trade) continue
    const applied = await applyAutoClose(close.tradeId, {
      level: close.level,
      at: close.at,
      note: options.note({
        symbol: trade.symbol,
        level: close.level,
        reason: close.reason,
        at: close.at,
        price: close.price,
      }),
    })
    if (applied) closes += 1
  }

  for (const update of result.ruleUpdates) {
    await updateAlert(update.id, update.patch)
  }

  await pruneAlertEvents(HISTORY_LIMIT)

  return { events, closes, reviews }
}

export function runAlertEvaluation(options: EngineOptions): Promise<EvaluationSummary> {
  if (inFlight) return inFlight
  const run = evaluateAndPersist(options)
  inFlight = run
  run.then(
    () => {
      if (inFlight === run) inFlight = null
    },
    () => {
      if (inFlight === run) inFlight = null
    },
  )
  return run
}
