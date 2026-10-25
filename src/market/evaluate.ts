import type { AlertEventDraft, PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { priceKeyFor, type ProviderPrice } from './types'

export interface EvaluationInput {
  now: number
  prices: ReadonlyMap<string, ProviderPrice>
  trades: readonly Trade[]
  rules: readonly PriceAlert[]
  staleMs: number
}

export interface AutoCloseDraft {
  tradeId: string
  level: number
  reason: 'target' | 'stop'
  at: number
  price: number
}

export type AlertRulePatch = Partial<
  Pick<PriceAlert, 'armed' | 'lastPrice' | 'lastFiredAt' | 'enabled' | 'referencePrice'>
>

export interface AlertRuleUpdate {
  id: string
  patch: AlertRulePatch
}

export interface EvaluationResult {
  events: AlertEventDraft[]
  closes: AutoCloseDraft[]
  reviews: AlertEventDraft[]
  ruleUpdates: AlertRuleUpdate[]
}

type RuleMode = 'above' | 'below' | 'crossing' | 'range' | 'percent'

interface EventFields {
  kind: AlertEventDraft['kind']
  tradeId: string | null
  ruleId: string | null
  symbol: string
  price: number
  level: number | null
  targetPrice: number | null
  stopPrice: number | null
  at: number
  provider: ProviderPrice['provider']
}

interface RuleDecision {
  fire: boolean
  rearm: boolean
}

function makeEvent(fields: EventFields): AlertEventDraft {
  return {
    kind: fields.kind,
    tradeId: fields.tradeId,
    ruleId: fields.ruleId,
    symbol: fields.symbol,
    price: fields.price,
    level: fields.level,
    targetPrice: fields.targetPrice,
    stopPrice: fields.stopPrice,
    at: fields.at,
    provider: fields.provider,
    status: 'unread',
    resolution: null,
    readAt: null,
  }
}

function crossedTarget(trade: Trade, price: number): number | null {
  if (trade.targetPrice === null) return null
  const hit = trade.direction === 'long' ? price >= trade.targetPrice : price <= trade.targetPrice
  return hit ? trade.targetPrice : null
}

function crossedStop(trade: Trade, price: number): number | null {
  if (trade.stopPrice === null) return null
  const hit = trade.direction === 'long' ? price <= trade.stopPrice : price >= trade.stopPrice
  return hit ? trade.stopPrice : null
}

function tradeEvent(
  kind: 'target' | 'stop' | 'gap' | 'stale',
  trade: Trade,
  price: ProviderPrice,
  at: number,
  level: number | null,
): AlertEventDraft {
  return makeEvent({
    kind,
    tradeId: trade.id,
    ruleId: null,
    symbol: trade.symbol,
    price: price.price,
    level,
    targetPrice: trade.targetPrice,
    stopPrice: trade.stopPrice,
    at,
    provider: price.provider,
  })
}

function ruleMode(rule: PriceAlert): RuleMode | null {
  if (rule.kind === 'percent') return 'percent'
  if (rule.kind === 'price') return rule.priceMode
  return null
}

function isRuleEvaluable(rule: PriceAlert): boolean {
  const mode = ruleMode(rule)
  if (mode === null) return false
  if (mode === 'percent') {
    return (
      rule.percent !== null &&
      rule.percent > 0 &&
      rule.percentDirection !== null &&
      rule.referencePrice !== null &&
      rule.referencePrice !== 0
    )
  }
  if (mode === 'range') {
    return rule.rangeLow !== null && rule.rangeHigh !== null
  }
  return rule.level !== null
}

function percentActive(rule: PriceAlert, price: number): boolean {
  const reference = rule.referencePrice
  const percent = rule.percent
  const direction = rule.percentDirection
  if (reference === null || reference === 0 || percent === null || direction === null) return false

  const change = ((price - reference) / reference) * 100
  if (direction === 'up') return change >= percent
  if (direction === 'down') return change <= -percent
  return Math.abs(change) >= percent
}

function priceActive(rule: PriceAlert, mode: Exclude<RuleMode, 'percent'>, price: number): boolean {
  if (mode === 'range') {
    return (
      rule.rangeLow !== null &&
      rule.rangeHigh !== null &&
      (price < rule.rangeLow || price > rule.rangeHigh)
    )
  }

  const level = rule.level
  if (level === null) return false
  if (mode === 'above') return price >= level
  if (mode === 'below') return price <= level
  return false
}

function isCrossing(rule: PriceAlert, price: number): boolean {
  const level = rule.level
  const last = rule.lastPrice
  if (level === null || last === null) return false
  return (last < level && price >= level) || (last > level && price <= level)
}

function decideRule(rule: PriceAlert, price: number): RuleDecision {
  const mode = ruleMode(rule)
  if (mode === null) return { fire: false, rearm: false }

  if (mode === 'percent') {
    const active = percentActive(rule, price)
    if (rule.repeat === 'cross-back' && !rule.armed) {
      return { fire: false, rearm: !active }
    }
    return { fire: active, rearm: false }
  }

  if (mode === 'crossing') {
    const crossing = isCrossing(rule, price)
    if (rule.repeat === 'cross-back' && !rule.armed) {
      return { fire: false, rearm: !crossing }
    }
    return { fire: crossing, rearm: false }
  }

  const active = priceActive(rule, mode, price)
  if (rule.repeat === 'cross-back' && !rule.armed) {
    return { fire: false, rearm: !active }
  }
  return { fire: active, rearm: false }
}

function cooldownElapsed(rule: PriceAlert, now: number): boolean {
  if (rule.repeat !== 'cooldown') return true
  if (rule.lastFiredAt === null) return true
  return now - rule.lastFiredAt >= rule.cooldownMinutes * 60_000
}

function ruleEventLevel(rule: PriceAlert): number | null {
  if (rule.kind !== 'price') return null
  if (rule.priceMode === 'range') return null
  return rule.level
}

function ruleEvent(
  kind: 'level' | 'percent' | 'stale',
  rule: PriceAlert,
  price: ProviderPrice,
  at: number,
): AlertEventDraft {
  return makeEvent({
    kind,
    tradeId: null,
    ruleId: rule.id,
    symbol: rule.symbol,
    price: price.price,
    level: ruleEventLevel(rule),
    targetPrice: null,
    stopPrice: null,
    at,
    provider: price.provider,
  })
}

export function evaluatePrices(input: EvaluationInput): EvaluationResult {
  const events: AlertEventDraft[] = []
  const closes: AutoCloseDraft[] = []
  const reviews: AlertEventDraft[] = []
  const ruleUpdates: AlertRuleUpdate[] = []

  for (const trade of input.trades) {
    if (trade.status !== 'open') continue

    const price = input.prices.get(priceKeyFor(trade))
    if (!price) continue

    const target = crossedTarget(trade, price.price)
    const stop = crossedStop(trade, price.price)
    if (target === null && stop === null) continue

    const fresh = input.now - price.fetchedAt < input.staleMs

    if (!fresh) {
      const level = target !== null && stop !== null ? null : (target ?? stop)
      reviews.push(tradeEvent('stale', trade, price, input.now, level))
      continue
    }

    if (target !== null && stop !== null) {
      reviews.push(tradeEvent('gap', trade, price, input.now, null))
      continue
    }

    const reason = target !== null ? 'target' : 'stop'
    const level = target ?? stop
    if (level === null) continue

    events.push(tradeEvent(reason, trade, price, input.now, level))
    if (trade.autoClose) {
      closes.push({
        tradeId: trade.id,
        level,
        reason,
        at: input.now,
        price: price.price,
      })
    }
  }

  for (const rule of input.rules) {
    if (!rule.enabled) continue
    if (!rule.binanceSymbol && !rule.coingeckoId) continue
    if (!isRuleEvaluable(rule)) continue

    const price = input.prices.get(priceKeyFor(rule))
    if (!price) continue

    const fresh = input.now - price.fetchedAt < input.staleMs
    const decision = decideRule(rule, price.price)
    const fire = decision.fire && cooldownElapsed(rule, input.now)

    if (!fresh) {
      if (fire) {
        reviews.push(ruleEvent('stale', rule, price, input.now))
      }
      continue
    }

    const patch: AlertRulePatch = {}
    if (rule.lastPrice !== price.price) {
      patch.lastPrice = price.price
    }

    if (fire) {
      patch.lastFiredAt = input.now
      if (rule.kind === 'percent') {
        patch.referencePrice = price.price
      }
      if (rule.repeat === 'once') {
        patch.enabled = false
      }
      if (rule.repeat === 'cross-back' && rule.armed) {
        patch.armed = false
      }
      events.push(ruleEvent(rule.kind === 'percent' ? 'percent' : 'level', rule, price, input.now))
    } else if (decision.rearm && !rule.armed) {
      patch.armed = true
    }

    if (Object.keys(patch).length > 0) {
      ruleUpdates.push({ id: rule.id, patch })
    }
  }

  return { events, closes, reviews, ruleUpdates }
}
