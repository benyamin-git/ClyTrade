import type { AlertEvent, AlertEventKind } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { getAlertEvent, importAlertEvent, updateAlert } from '@/data/repositories/alerts.repo'
import { applyAutoClose, getTrade } from '@/data/repositories/trades.repo'
import { backgroundEventSchema, type BackgroundEvent } from './background'

export const QUEUED_EVENT_MAX_AGE_MS = 24 * 60 * 60_000

export interface BackgroundNoteInput {
  symbol: string
  level: number
  reason: 'target' | 'stop'
  at: number
}

export type BackgroundNote = (input: BackgroundNoteInput) => string

export interface BackgroundImportSummary {
  imported: number
  closed: number
  reviews: number
}

function toAlertEvent(event: BackgroundEvent, id: string, kind: AlertEventKind): AlertEvent {
  return {
    id,
    kind,
    tradeId: event.tradeId,
    ruleId: event.ruleId,
    symbol: event.symbol,
    price: event.price,
    level: event.level,
    targetPrice: event.targetPrice,
    stopPrice: event.stopPrice,
    at: event.at,
    provider: event.provider,
    status: 'unread',
    resolution: null,
    readAt: null,
    createdAt: Date.now(),
  }
}

function isTradeHit(event: BackgroundEvent, trade: Trade | undefined): trade is Trade {
  if (!trade || trade.status !== 'open') return false
  if (trade.direction !== event.direction) return false
  if (trade.targetPrice !== event.targetPrice) return false
  if (trade.stopPrice !== event.stopPrice) return false
  if (event.level === null) return false
  return event.kind === 'target'
    ? event.level === trade.targetPrice
    : event.level === trade.stopPrice
}

async function applyRuleState(event: BackgroundEvent): Promise<void> {
  if (event.ruleId === null || event.ruleState === undefined) return
  await updateAlert(event.ruleId, {
    armed: event.ruleState.armed,
    lastPrice: event.ruleState.lastPrice,
    lastFiredAt: event.ruleState.lastFiredAt,
    referencePrice: event.ruleState.referencePrice,
    enabled: event.ruleState.enabled,
  }).catch(() => undefined)
}

export async function importBackgroundEvents(
  events: readonly BackgroundEvent[],
  now: number,
  note: BackgroundNote,
): Promise<BackgroundImportSummary> {
  let imported = 0
  let closed = 0
  let reviews = 0

  for (const candidate of events) {
    const parsed = backgroundEventSchema.safeParse(candidate)
    if (!parsed.success) continue
    const event = parsed.data

    if (await getAlertEvent(event.id)) continue

    if (event.kind !== 'target' && event.kind !== 'stop') {
      const inserted = await importAlertEvent(toAlertEvent(event, event.id, event.kind))
      if (inserted) imported += 1
      await applyRuleState(event)
      continue
    }

    const level = event.level
    const trade = event.tradeId === null ? undefined : await getTrade(event.tradeId)
    const fresh = now - event.at < QUEUED_EVENT_MAX_AGE_MS

    if (!fresh || level === null || !isTradeHit(event, trade)) {
      const inserted = await importAlertEvent(
        toAlertEvent(event, `conflict:${event.id}`, 'conflict'),
      )
      if (inserted) reviews += 1
      continue
    }

    const inserted = await importAlertEvent(toAlertEvent(event, event.id, event.kind))
    if (!inserted) continue
    imported += 1

    if (!trade.autoClose) continue

    const applied = await applyAutoClose(trade.id, {
      level,
      at: event.at,
      note: note({
        symbol: trade.symbol,
        level,
        reason: event.kind,
        at: event.at,
      }),
    })
    if (applied) closed += 1
  }

  return { imported, closed, reviews }
}
