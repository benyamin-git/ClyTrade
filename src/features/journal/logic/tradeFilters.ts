import type { Market } from '@/data/models/market'
import type { Direction, Trade } from '@/data/models/trade'
import type { FilterGroupDescriptor, Range, TriState } from '@/features/filters/filterTypes'
import {
  EMPTY_RANGE,
  inRange,
  isRangeActive,
  matchesText,
  matchesTriState,
} from '@/features/filters/filterUtils'
import type { TradeRow } from './tradeRows'

export type TradeOutcomeFilter = 'all' | 'win' | 'loss' | 'breakeven'
export type TradeDirectionFilter = 'all' | Direction
export type TradeStatusFilter = 'all' | 'open' | 'closed'

export interface TradeFilters {
  search: string
  markets: Market[]
  direction: TradeDirectionFilter
  status: TradeStatusFilter
  tags: string[]
  strategies: string[]
  opened: Range
  closed: Range
  entry: Range
  exit: Range
  size: Range
  leverage: Range
  fees: Range
  netPnl: Range
  rMultiple: Range
  duration: Range
  outcome: TradeOutcomeFilter
  hasStop: TriState
  hasTarget: TriState
  hasNotes: TriState
  hasTags: TriState
}

export interface TradeNumericBounds {
  opened: { min: number; max: number }
  closed: { min: number; max: number }
  entry: { min: number; max: number }
  exit: { min: number; max: number }
  size: { min: number; max: number }
  leverage: { min: number; max: number }
  fees: { min: number; max: number }
  netPnl: { min: number; max: number }
  rMultiple: { min: number; max: number }
  duration: { min: number; max: number }
}

export const DEFAULT_TRADE_FILTERS: TradeFilters = {
  search: '',
  markets: [],
  direction: 'all',
  status: 'all',
  tags: [],
  strategies: [],
  opened: { ...EMPTY_RANGE },
  closed: { ...EMPTY_RANGE },
  entry: { ...EMPTY_RANGE },
  exit: { ...EMPTY_RANGE },
  size: { ...EMPTY_RANGE },
  leverage: { ...EMPTY_RANGE },
  fees: { ...EMPTY_RANGE },
  netPnl: { ...EMPTY_RANGE },
  rMultiple: { ...EMPTY_RANGE },
  duration: { ...EMPTY_RANGE },
  outcome: 'all',
  hasStop: 'any',
  hasTarget: 'any',
  hasNotes: 'any',
  hasTags: 'any',
}

export function filterTrades(rows: readonly TradeRow[], filters: TradeFilters): TradeRow[] {
  return rows.filter((row) => matchesTrade(row, filters))
}

function matchesTrade(row: TradeRow, filters: TradeFilters): boolean {
  const { trade, metrics } = row

  if (!matchesText([trade.symbol, trade.strategy, trade.notes, ...trade.tags], filters.search)) {
    return false
  }
  if (filters.markets.length > 0 && !filters.markets.includes(trade.market)) return false
  if (filters.direction !== 'all' && trade.direction !== filters.direction) return false
  if (filters.status === 'open' && trade.exitPrice !== null) return false
  if (filters.status === 'closed' && trade.exitPrice === null) return false
  if (filters.tags.length > 0 && !filters.tags.some((tag) => trade.tags.includes(tag))) return false
  if (
    filters.strategies.length > 0 &&
    (trade.strategy === null || !filters.strategies.includes(trade.strategy))
  ) {
    return false
  }

  if (isRangeActive(filters.opened) && !inRange(trade.openedAt, filters.opened)) return false
  if (isRangeActive(filters.closed)) {
    if (trade.closedAt === null) return false
    if (!inRange(trade.closedAt, filters.closed)) return false
  }
  if (isRangeActive(filters.entry) && !inRange(trade.entryPrice, filters.entry)) return false
  if (isRangeActive(filters.exit)) {
    if (trade.exitPrice === null) return false
    if (!inRange(trade.exitPrice, filters.exit)) return false
  }
  if (isRangeActive(filters.size) && !inRange(trade.size, filters.size)) return false
  if (isRangeActive(filters.leverage) && !inRange(trade.leverage, filters.leverage)) return false
  if (isRangeActive(filters.fees) && !inRange(trade.fees, filters.fees)) return false

  const netPnl = metrics?.netPnl ?? null
  if (isRangeActive(filters.netPnl)) {
    if (netPnl === null || !inRange(netPnl, filters.netPnl)) return false
  }

  const rMultiple = metrics?.rMultiple ?? null
  if (isRangeActive(filters.rMultiple)) {
    if (rMultiple === null || !inRange(rMultiple, filters.rMultiple)) return false
  }

  const duration = metrics?.durationMs ?? null
  if (isRangeActive(filters.duration)) {
    if (duration === null || !inRange(duration, filters.duration)) return false
  }

  if (filters.outcome !== 'all') {
    if (netPnl === null) return false
    if (filters.outcome === 'win' && netPnl <= 0) return false
    if (filters.outcome === 'loss' && netPnl >= 0) return false
    if (filters.outcome === 'breakeven' && netPnl !== 0) return false
  }

  if (!matchesTriState(trade.stopPrice !== null, filters.hasStop)) return false
  if (!matchesTriState(trade.targetPrice !== null, filters.hasTarget)) return false
  if (!matchesTriState(trade.notes !== null && trade.notes.trim() !== '', filters.hasNotes)) {
    return false
  }
  if (!matchesTriState(trade.tags.length > 0, filters.hasTags)) return false

  return true
}

export function tradeTagOptions(trades: readonly Trade[]): string[] {
  const tags = new Set<string>()
  for (const trade of trades) {
    for (const tag of trade.tags) tags.add(tag)
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
}

export function tradeStrategyOptions(trades: readonly Trade[]): string[] {
  const strategies = new Set<string>()
  for (const trade of trades) {
    if (trade.strategy !== null && trade.strategy.trim() !== '') strategies.add(trade.strategy)
  }
  return [...strategies].sort((a, b) => a.localeCompare(b))
}

function boundsOf(values: readonly number[]): { min: number; max: number } {
  let min = 0
  let max = 0
  let seen = false
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    if (!seen) {
      min = value
      max = value
      seen = true
    } else {
      if (value < min) min = value
      if (value > max) max = value
    }
  }
  return { min, max }
}

export function tradeNumericBounds(rows: readonly TradeRow[]): TradeNumericBounds {
  const opened: number[] = []
  const closed: number[] = []
  const entry: number[] = []
  const exit: number[] = []
  const size: number[] = []
  const leverage: number[] = []
  const fees: number[] = []
  const netPnl: number[] = []
  const rMultiple: number[] = []
  const duration: number[] = []

  for (const { trade, metrics } of rows) {
    opened.push(trade.openedAt)
    if (trade.closedAt !== null) closed.push(trade.closedAt)
    entry.push(trade.entryPrice)
    if (trade.exitPrice !== null) exit.push(trade.exitPrice)
    size.push(trade.size)
    leverage.push(trade.leverage)
    fees.push(trade.fees)

    const pnl = metrics?.netPnl ?? null
    if (pnl !== null) netPnl.push(pnl)
    const r = metrics?.rMultiple ?? null
    if (r !== null) rMultiple.push(r)
    const hold = metrics?.durationMs ?? null
    if (hold !== null) duration.push(hold)
  }

  return {
    opened: boundsOf(opened),
    closed: boundsOf(closed),
    entry: boundsOf(entry),
    exit: boundsOf(exit),
    size: boundsOf(size),
    leverage: boundsOf(leverage),
    fees: boundsOf(fees),
    netPnl: boundsOf(netPnl),
    rMultiple: boundsOf(rMultiple),
    duration: boundsOf(duration),
  }
}

export const TRADE_FILTER_GROUPS: readonly FilterGroupDescriptor<TradeFilters>[] = [
  {
    id: 'text',
    labelKey: 'filters.sections.text',
    isActive: (filters) => filters.search.trim() !== '',
    clear: (filters) => ({ ...filters, search: '' }),
  },
  {
    id: 'market',
    labelKey: 'filters.sections.market',
    isActive: (filters) => filters.markets.length > 0,
    clear: (filters) => ({ ...filters, markets: [] }),
  },
  {
    id: 'direction',
    labelKey: 'filters.sections.direction',
    isActive: (filters) => filters.direction !== 'all',
    clear: (filters) => ({ ...filters, direction: 'all' }),
  },
  {
    id: 'status',
    labelKey: 'filters.sections.status',
    isActive: (filters) => filters.status !== 'all',
    clear: (filters) => ({ ...filters, status: 'all' }),
  },
  {
    id: 'tags',
    labelKey: 'filters.sections.tags',
    isActive: (filters) => filters.tags.length > 0,
    clear: (filters) => ({ ...filters, tags: [] }),
  },
  {
    id: 'strategies',
    labelKey: 'filters.sections.strategies',
    isActive: (filters) => filters.strategies.length > 0,
    clear: (filters) => ({ ...filters, strategies: [] }),
  },
  {
    id: 'dates',
    labelKey: 'filters.sections.dates',
    isActive: (filters) => isRangeActive(filters.opened) || isRangeActive(filters.closed),
    clear: (filters) => ({
      ...filters,
      opened: { ...EMPTY_RANGE },
      closed: { ...EMPTY_RANGE },
    }),
  },
  {
    id: 'priceSize',
    labelKey: 'filters.sections.priceSize',
    isActive: (filters) =>
      isRangeActive(filters.entry) ||
      isRangeActive(filters.exit) ||
      isRangeActive(filters.size) ||
      isRangeActive(filters.leverage),
    clear: (filters) => ({
      ...filters,
      entry: { ...EMPTY_RANGE },
      exit: { ...EMPTY_RANGE },
      size: { ...EMPTY_RANGE },
      leverage: { ...EMPTY_RANGE },
    }),
  },
  {
    id: 'performance',
    labelKey: 'filters.sections.performance',
    isActive: (filters) =>
      isRangeActive(filters.fees) ||
      isRangeActive(filters.netPnl) ||
      isRangeActive(filters.rMultiple) ||
      isRangeActive(filters.duration),
    clear: (filters) => ({
      ...filters,
      fees: { ...EMPTY_RANGE },
      netPnl: { ...EMPTY_RANGE },
      rMultiple: { ...EMPTY_RANGE },
      duration: { ...EMPTY_RANGE },
    }),
  },
  {
    id: 'outcome',
    labelKey: 'filters.sections.outcome',
    isActive: (filters) => filters.outcome !== 'all',
    clear: (filters) => ({ ...filters, outcome: 'all' }),
  },
  {
    id: 'presence',
    labelKey: 'filters.sections.presence',
    isActive: (filters) =>
      filters.hasStop !== 'any' ||
      filters.hasTarget !== 'any' ||
      filters.hasNotes !== 'any' ||
      filters.hasTags !== 'any',
    clear: (filters) => ({
      ...filters,
      hasStop: 'any',
      hasTarget: 'any',
      hasNotes: 'any',
      hasTags: 'any',
    }),
  },
]
