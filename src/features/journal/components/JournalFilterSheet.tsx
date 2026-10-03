import type { ReactNode } from 'react'
import { MARKET_IDS, type Market } from '@/data/models/market'
import { FilterSheet, type FilterSectionSpec } from '@/features/filters/FilterSheet'
import type { TriState } from '@/features/filters/filterTypes'
import {
  countRange,
  countTriState,
  sectionCount,
  withRangeBound,
} from '@/features/filters/filterUtils'
import { useI18n } from '@/i18n/I18nContext'
import { fromDateInputValue, TIME_RANGES, toDateInputValue, type TimeRange } from '@/lib/dates'
import { formatNumber, formatPrice } from '@/lib/format'
import { DateField } from '@/ui/components/DateField'
import { MultiSelectField } from '@/ui/components/MultiSelectField'
import { RangeField } from '@/ui/components/RangeField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { TextField } from '@/ui/components/TextField'
import {
  TRADE_FILTER_GROUPS,
  type TradeFilters,
  type TradeNumericBounds,
} from '../logic/tradeFilters'

export interface JournalFilterSheetProps {
  open: boolean
  onClose: () => void
  filters: TradeFilters
  onChange: (partial: Partial<TradeFilters>) => void
  onReset: () => void
  tagOptions: readonly string[]
  strategyOptions: readonly string[]
  bounds: TradeNumericBounds
  variant: 'overview' | 'stats'
  timeRange?: {
    value: TimeRange
    isDefault: boolean
    onChange: (value: TimeRange) => void
  }
}

function dateValue(timestamp: number | null): string {
  return timestamp === null ? '' : toDateInputValue(new Date(timestamp))
}

function dateBound(value: string, edge: 'start' | 'end'): number | null {
  const date = fromDateInputValue(value)
  if (date === null) return null
  if (edge === 'end') date.setHours(23, 59, 59, 999)
  return date.getTime()
}

const SECTION_COUNTERS: Readonly<Record<string, (filters: TradeFilters) => number>> = {
  text: (filters) => (filters.search.trim() === '' ? 0 : 1),
  market: (filters) => filters.markets.length,
  direction: (filters) => (filters.direction === 'all' ? 0 : 1),
  status: (filters) => (filters.status === 'all' ? 0 : 1),
  tags: (filters) => filters.tags.length,
  strategies: (filters) => filters.strategies.length,
  dates: (filters) => countRange(filters.opened) + countRange(filters.closed),
  priceSize: (filters) =>
    countRange(filters.entry) +
    countRange(filters.exit) +
    countRange(filters.size) +
    countRange(filters.leverage),
  performance: (filters) =>
    countRange(filters.fees) +
    countRange(filters.netPnl) +
    countRange(filters.rMultiple) +
    countRange(filters.duration),
  outcome: (filters) => (filters.outcome === 'all' ? 0 : 1),
  presence: (filters) =>
    countTriState(filters.hasStop) +
    countTriState(filters.hasTarget) +
    countTriState(filters.hasNotes) +
    countTriState(filters.hasTags),
}

interface TriStateFieldProps {
  label: string
  value: TriState
  onChange: (value: TriState) => void
}

function TriStateField({ label, value, onChange }: TriStateFieldProps) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {label}
      </span>
      <SegmentedControl
        value={value}
        onChange={onChange}
        ariaLabel={label}
        fullWidth
        options={[
          { value: 'any', label: t('filters.triState.any') },
          { value: 'has', label: t('filters.triState.has') },
          { value: 'missing', label: t('filters.triState.missing') },
        ]}
      />
    </div>
  )
}

export function JournalFilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  tagOptions,
  strategyOptions,
  bounds,
  variant,
  timeRange,
}: JournalFilterSheetProps) {
  const { t } = useI18n()

  const marketOptions = MARKET_IDS.map((id) => ({ value: id, label: t(`markets.${id}`) }))

  function controlFor(id: string): ReactNode {
    switch (id) {
      case 'text':
        return (
          <TextField
            label={t('filters.sections.text')}
            value={filters.search}
            onChange={(search) => onChange({ search })}
            placeholder={t('filters.searchPlaceholder')}
            hideLabel
          />
        )
      case 'market':
        return (
          <MultiSelectField
            label={t('fields.market')}
            value={filters.markets}
            options={marketOptions}
            onChange={(values) => onChange({ markets: values as Market[] })}
            hideLabel
          />
        )
      case 'direction':
        return (
          <SegmentedControl
            value={filters.direction}
            onChange={(direction) => onChange({ direction })}
            ariaLabel={t('filters.sections.direction')}
            fullWidth
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'long', label: t('direction.long') },
              { value: 'short', label: t('direction.short') },
            ]}
          />
        )
      case 'status':
        return (
          <SegmentedControl
            value={filters.status}
            onChange={(status) => onChange({ status })}
            ariaLabel={t('filters.sections.status')}
            fullWidth
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'open', label: t('status.open') },
              { value: 'closed', label: t('status.closed') },
            ]}
          />
        )
      case 'tags':
        return (
          <MultiSelectField
            label={t('fields.tags')}
            value={filters.tags}
            options={tagOptions.map((tag) => ({ value: tag, label: tag }))}
            onChange={(tags) => onChange({ tags })}
            hideLabel
          />
        )
      case 'strategies':
        return (
          <MultiSelectField
            label={t('fields.strategy')}
            value={filters.strategies}
            options={strategyOptions.map((strategy) => ({ value: strategy, label: strategy }))}
            onChange={(strategies) => onChange({ strategies })}
            hideLabel
          />
        )
      case 'dates':
        return (
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label={`${t('fields.opened')} ${t('filters.min')}`}
              value={dateValue(filters.opened.min)}
              onChange={(value) =>
                onChange({
                  opened: withRangeBound(filters.opened, 'min', dateBound(value, 'start')),
                })
              }
            />
            <DateField
              label={`${t('fields.opened')} ${t('filters.max')}`}
              value={dateValue(filters.opened.max)}
              onChange={(value) =>
                onChange({
                  opened: withRangeBound(filters.opened, 'max', dateBound(value, 'end')),
                })
              }
            />
            <DateField
              label={`${t('fields.closed')} ${t('filters.min')}`}
              value={dateValue(filters.closed.min)}
              onChange={(value) =>
                onChange({
                  closed: withRangeBound(filters.closed, 'min', dateBound(value, 'start')),
                })
              }
            />
            <DateField
              label={`${t('fields.closed')} ${t('filters.max')}`}
              value={dateValue(filters.closed.max)}
              onChange={(value) =>
                onChange({
                  closed: withRangeBound(filters.closed, 'max', dateBound(value, 'end')),
                })
              }
            />
          </div>
        )
      case 'priceSize':
        return (
          <div className="flex flex-col gap-3">
            <RangeField
              label={t('fields.entryPrice')}
              value={filters.entry}
              onChange={(entry) => onChange({ entry })}
              min={bounds.entry.min}
              max={bounds.entry.max}
              format={formatPrice}
            />
            <RangeField
              label={t('fields.exitPrice')}
              value={filters.exit}
              onChange={(exit) => onChange({ exit })}
              min={bounds.exit.min}
              max={bounds.exit.max}
              format={formatPrice}
            />
            <RangeField
              label={t('fields.size')}
              value={filters.size}
              onChange={(size) => onChange({ size })}
              min={bounds.size.min}
              max={bounds.size.max}
              format={formatNumber}
            />
            <RangeField
              label={t('fields.leverage')}
              value={filters.leverage}
              onChange={(leverage) => onChange({ leverage })}
              min={bounds.leverage.min}
              max={bounds.leverage.max}
              format={formatNumber}
            />
          </div>
        )
      case 'performance':
        return (
          <div className="flex flex-col gap-3">
            <RangeField
              label={t('fields.feesTotal')}
              value={filters.fees}
              onChange={(fees) => onChange({ fees })}
              min={bounds.fees.min}
              max={bounds.fees.max}
              format={formatNumber}
            />
            <RangeField
              label={t('journal.columns.netPnl')}
              value={filters.netPnl}
              onChange={(netPnl) => onChange({ netPnl })}
              min={bounds.netPnl.min}
              max={bounds.netPnl.max}
              format={formatNumber}
            />
            <RangeField
              label={t('filters.rMultiple')}
              value={filters.rMultiple}
              onChange={(rMultiple) => onChange({ rMultiple })}
              min={bounds.rMultiple.min}
              max={bounds.rMultiple.max}
              format={formatNumber}
            />
            <RangeField
              label={t('filters.duration')}
              value={filters.duration}
              onChange={(duration) => onChange({ duration })}
              min={bounds.duration.min}
              max={bounds.duration.max}
              format={(value) => formatNumber(value, { maximumFractionDigits: 0 })}
            />
          </div>
        )
      case 'outcome':
        return (
          <SegmentedControl
            value={filters.outcome}
            onChange={(outcome) =>
              onChange({ outcome: outcome === filters.outcome ? 'all' : outcome })
            }
            ariaLabel={t('filters.sections.outcome')}
            variant="separated"
            options={[
              { value: 'win', label: t('filters.outcome.win') },
              { value: 'loss', label: t('filters.outcome.loss') },
              { value: 'breakeven', label: t('filters.outcome.breakeven') },
            ]}
          />
        )
      case 'presence':
        return (
          <div className="flex flex-col gap-3">
            <TriStateField
              label={t('filters.hasStop')}
              value={filters.hasStop}
              onChange={(hasStop) => onChange({ hasStop })}
            />
            <TriStateField
              label={t('filters.hasTarget')}
              value={filters.hasTarget}
              onChange={(hasTarget) => onChange({ hasTarget })}
            />
            <TriStateField
              label={t('filters.hasNotes')}
              value={filters.hasNotes}
              onChange={(hasNotes) => onChange({ hasNotes })}
            />
            <TriStateField
              label={t('filters.hasTags')}
              value={filters.hasTags}
              onChange={(hasTags) => onChange({ hasTags })}
            />
          </div>
        )
      default:
        return null
    }
  }

  const sections: FilterSectionSpec[] = TRADE_FILTER_GROUPS.filter(
    (group) => !(variant === 'stats' && group.id === 'status'),
  ).map((group) => ({
    id: group.id,
    title: t(group.labelKey),
    count: sectionCount(group.id, SECTION_COUNTERS, filters),
    children: controlFor(group.id),
  }))

  if (variant === 'stats' && timeRange) {
    sections.unshift({
      id: 'timeRange',
      title: t('filters.sections.timeRange'),
      count: timeRange.isDefault ? 0 : 1,
      children: (
        <SegmentedControl
          value={timeRange.value}
          options={TIME_RANGES.map((id) => ({ value: id, label: t(`timeRange.${id}`) }))}
          onChange={timeRange.onChange}
          ariaLabel={t('filters.sections.timeRange')}
          size="sm"
          fullWidth
        />
      ),
    })
  }

  return <FilterSheet open={open} onClose={onClose} sections={sections} onClearAll={onReset} />
}
