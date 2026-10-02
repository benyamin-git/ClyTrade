import { calculateAssetMetrics } from '@/calculations/portfolioMetrics'
import type { Asset } from '@/data/models/asset'
import type { Market } from '@/data/models/market'
import type {
  FilterChipDescriptor,
  FilterGroupDescriptor,
  Range,
  TriState,
} from '@/features/filters/filterTypes'
import {
  EMPTY_RANGE,
  describeRange,
  inRange,
  isRangeActive,
  matchesText,
  matchesTriState,
} from '@/features/filters/filterUtils'
import type { TranslationKey } from '@/i18n/types'
import type { Translator } from '@/i18n/translate'
import { formatNumber, formatPercent, formatPrice } from '@/lib/format'

export type AssetOutcomeFilter = 'all' | 'gain' | 'loss' | 'breakeven'

export interface AssetRow {
  asset: Asset
  metrics: ReturnType<typeof calculateAssetMetrics>
}

export interface AssetFilters {
  search: string
  markets: Market[]
  quantity: Range
  avgCost: Range
  currentPrice: Range
  value: Range
  pnl: Range
  pnlPercent: Range
  outcome: AssetOutcomeFilter
  hasPrice: TriState
  hasNotes: TriState
}

export interface AssetNumericBounds {
  quantity: { min: number; max: number }
  avgCost: { min: number; max: number }
  currentPrice: { min: number; max: number }
  value: { min: number; max: number }
  pnl: { min: number; max: number }
  pnlPercent: { min: number; max: number }
}

type PresenceKey = 'hasPrice' | 'hasNotes'

export const DEFAULT_ASSET_FILTERS: AssetFilters = {
  search: '',
  markets: [],
  quantity: { ...EMPTY_RANGE },
  avgCost: { ...EMPTY_RANGE },
  currentPrice: { ...EMPTY_RANGE },
  value: { ...EMPTY_RANGE },
  pnl: { ...EMPTY_RANGE },
  pnlPercent: { ...EMPTY_RANGE },
  outcome: 'all',
  hasPrice: 'any',
  hasNotes: 'any',
}

export function toAssetRows(assets: readonly Asset[]): AssetRow[] {
  return assets.map((asset) => ({
    asset,
    metrics: calculateAssetMetrics({
      quantity: asset.quantity,
      averageCost: asset.averageCost,
      currentPrice: asset.currentPrice,
    }),
  }))
}

export function filterAssets(rows: readonly AssetRow[], filters: AssetFilters): AssetRow[] {
  return rows.filter((row) => matchesAsset(row, filters))
}

function matchesAsset(row: AssetRow, filters: AssetFilters): boolean {
  const { asset, metrics } = row

  if (!matchesText([asset.symbol, asset.name, asset.notes], filters.search)) return false
  if (filters.markets.length > 0 && !filters.markets.includes(asset.market)) return false

  if (isRangeActive(filters.quantity) && !inRange(asset.quantity, filters.quantity)) return false
  if (isRangeActive(filters.avgCost) && !inRange(asset.averageCost, filters.avgCost)) return false

  const currentPrice = asset.currentPrice
  if (isRangeActive(filters.currentPrice)) {
    if (currentPrice === null || !inRange(currentPrice, filters.currentPrice)) return false
  }

  const value = metrics?.value ?? null
  if (isRangeActive(filters.value)) {
    if (value === null || !inRange(value, filters.value)) return false
  }

  const pnl = metrics?.pnl ?? null
  if (isRangeActive(filters.pnl)) {
    if (pnl === null || !inRange(pnl, filters.pnl)) return false
  }

  const pnlPercent = metrics?.pnlPercent ?? null
  if (isRangeActive(filters.pnlPercent)) {
    if (pnlPercent === null || !inRange(pnlPercent, filters.pnlPercent)) return false
  }

  if (filters.outcome !== 'all') {
    if (pnl === null) return false
    if (filters.outcome === 'gain' && pnl <= 0) return false
    if (filters.outcome === 'loss' && pnl >= 0) return false
    if (filters.outcome === 'breakeven' && pnl !== 0) return false
  }

  if (!matchesTriState(asset.currentPrice !== null, filters.hasPrice)) return false
  if (!matchesTriState(asset.notes !== null && asset.notes.trim() !== '', filters.hasNotes)) {
    return false
  }

  return true
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

export function assetNumericBounds(rows: readonly AssetRow[]): AssetNumericBounds {
  const quantity: number[] = []
  const avgCost: number[] = []
  const currentPrice: number[] = []
  const value: number[] = []
  const pnl: number[] = []
  const pnlPercent: number[] = []

  for (const { asset, metrics } of rows) {
    quantity.push(asset.quantity)
    avgCost.push(asset.averageCost)
    if (asset.currentPrice !== null) currentPrice.push(asset.currentPrice)

    const assetValue = metrics?.value ?? null
    if (assetValue !== null) value.push(assetValue)
    const assetPnl = metrics?.pnl ?? null
    if (assetPnl !== null) pnl.push(assetPnl)
    const assetPnlPercent = metrics?.pnlPercent ?? null
    if (assetPnlPercent !== null) pnlPercent.push(assetPnlPercent)
  }

  return {
    quantity: boundsOf(quantity),
    avgCost: boundsOf(avgCost),
    currentPrice: boundsOf(currentPrice),
    value: boundsOf(value),
    pnl: boundsOf(pnl),
    pnlPercent: boundsOf(pnlPercent),
  }
}

export const ASSET_FILTER_GROUPS: readonly FilterGroupDescriptor<AssetFilters>[] = [
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
    id: 'priceSize',
    labelKey: 'filters.sections.priceSize',
    isActive: (filters) =>
      isRangeActive(filters.quantity) ||
      isRangeActive(filters.avgCost) ||
      isRangeActive(filters.currentPrice),
    clear: (filters) => ({
      ...filters,
      quantity: { ...EMPTY_RANGE },
      avgCost: { ...EMPTY_RANGE },
      currentPrice: { ...EMPTY_RANGE },
    }),
  },
  {
    id: 'performance',
    labelKey: 'filters.sections.performance',
    isActive: (filters) =>
      isRangeActive(filters.value) ||
      isRangeActive(filters.pnl) ||
      isRangeActive(filters.pnlPercent),
    clear: (filters) => ({
      ...filters,
      value: { ...EMPTY_RANGE },
      pnl: { ...EMPTY_RANGE },
      pnlPercent: { ...EMPTY_RANGE },
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
    isActive: (filters) => filters.hasPrice !== 'any' || filters.hasNotes !== 'any',
    clear: (filters) => ({ ...filters, hasPrice: 'any', hasNotes: 'any' }),
  },
]

function clearPresence(filters: AssetFilters, key: PresenceKey): AssetFilters {
  switch (key) {
    case 'hasPrice':
      return { ...filters, hasPrice: 'any' }
    case 'hasNotes':
      return { ...filters, hasNotes: 'any' }
  }
}

function presenceChip(
  key: PresenceKey,
  state: TriState,
  labelKey: TranslationKey,
  t: Translator,
): FilterChipDescriptor<AssetFilters> {
  return {
    id: key,
    label: `${t(labelKey)}: ${t(`filters.triState.${state}`)}`,
    clear: (filters) => clearPresence(filters, key),
  }
}

export function buildAssetChips(
  filters: AssetFilters,
  t: Translator,
): FilterChipDescriptor<AssetFilters>[] {
  const chips: FilterChipDescriptor<AssetFilters>[] = []

  if (filters.search.trim() !== '') {
    chips.push({
      id: 'search',
      label: `${t('filters.sections.text')}: ${filters.search.trim()}`,
      clear: (current) => ({ ...current, search: '' }),
    })
  }

  for (const market of filters.markets) {
    chips.push({
      id: `market:${market}`,
      label: t(`markets.${market}`),
      clear: (current) => ({
        ...current,
        markets: current.markets.filter((item) => item !== market),
      }),
    })
  }

  if (filters.outcome !== 'all') {
    chips.push({
      id: 'outcome',
      label: t(`filters.assetOutcome.${filters.outcome}`),
      clear: (current) => ({ ...current, outcome: 'all' }),
    })
  }

  const pushRange = (
    id: string,
    labelKey: TranslationKey,
    range: Range,
    format: (value: number) => string,
    clear: (current: AssetFilters) => AssetFilters,
  ) => {
    const description = describeRange(range, format)
    if (description !== null) {
      chips.push({ id, label: `${t(labelKey)}: ${description}`, clear })
    }
  }

  pushRange('quantity', 'filters.quantity', filters.quantity, formatNumber, (current) => ({
    ...current,
    quantity: { ...EMPTY_RANGE },
  }))
  pushRange('avgCost', 'filters.avgCost', filters.avgCost, formatPrice, (current) => ({
    ...current,
    avgCost: { ...EMPTY_RANGE },
  }))
  pushRange(
    'currentPrice',
    'filters.currentPrice',
    filters.currentPrice,
    formatPrice,
    (current) => ({
      ...current,
      currentPrice: { ...EMPTY_RANGE },
    }),
  )
  pushRange('value', 'filters.value', filters.value, formatNumber, (current) => ({
    ...current,
    value: { ...EMPTY_RANGE },
  }))
  pushRange('pnl', 'filters.pnl', filters.pnl, formatNumber, (current) => ({
    ...current,
    pnl: { ...EMPTY_RANGE },
  }))
  pushRange('pnlPercent', 'filters.pnlPercent', filters.pnlPercent, formatPercent, (current) => ({
    ...current,
    pnlPercent: { ...EMPTY_RANGE },
  }))

  if (filters.hasPrice !== 'any') {
    chips.push(presenceChip('hasPrice', filters.hasPrice, 'filters.hasPrice', t))
  }
  if (filters.hasNotes !== 'any') {
    chips.push(presenceChip('hasNotes', filters.hasNotes, 'filters.hasNotes', t))
  }

  return chips
}
