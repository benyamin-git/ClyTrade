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
  note: (input: { symbol: string; level: number; reason: 'target' | 'stop'; at: number }) => string
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

function dedupeKey(event: AlertEventDraft): string {
  const owner = event.tradeId ?? event.ruleId ?? ''
  if (event.kind === 'gap' || event.kind === 'stale') {
    return `${event.kind}|${owner}`
  }
  return `${event.kind}|${owner}|${event.level ?? ''}`
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

  const seen = new Set(
    history.filter((event) => isUnresolved(event.status)).map((event) => dedupeKey(event)),
  )
  let events = 0
  let reviews = 0

  for (const draft of result.events) {
    const key = dedupeKey(draft)
    if (seen.has(key)) continue
    seen.add(key)
    await createAlertEvent(draft)
    events += 1
  }

  for (const draft of result.reviews) {
    const key = dedupeKey(draft)
    if (seen.has(key)) continue
    seen.add(key)
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
