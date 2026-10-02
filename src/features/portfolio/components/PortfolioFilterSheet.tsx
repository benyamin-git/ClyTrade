import type { ReactNode } from 'react'
import { MARKET_IDS, type Market } from '@/data/models/market'
import { FilterSheet, type FilterSectionSpec } from '@/features/filters/FilterSheet'
import type { Range, TriState } from '@/features/filters/filterTypes'
import { useI18n } from '@/i18n/I18nContext'
import { formatNumber, formatPercent, formatPrice } from '@/lib/format'
import { MultiSelectField } from '@/ui/components/MultiSelectField'
import { RangeField } from '@/ui/components/RangeField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { TextField } from '@/ui/components/TextField'
import {
  ASSET_FILTER_GROUPS,
  type AssetFilters,
  type AssetNumericBounds,
} from '../logic/assetFilters'

export interface PortfolioFilterSheetProps {
  open: boolean
  onClose: () => void
  filters: AssetFilters
  onChange: (partial: Partial<AssetFilters>) => void
  onReset: () => void
  bounds: AssetNumericBounds
}

function countRange(range: Range): number {
  return (range.min !== null ? 1 : 0) + (range.max !== null ? 1 : 0)
}

function countTriState(state: TriState): number {
  return state === 'any' ? 0 : 1
}

function sectionCount(id: string, filters: AssetFilters): number {
  switch (id) {
    case 'text':
      return filters.search.trim() === '' ? 0 : 1
    case 'market':
      return filters.markets.length
    case 'priceSize':
      return (
        countRange(filters.quantity) +
        countRange(filters.avgCost) +
        countRange(filters.currentPrice)
      )
    case 'performance':
      return countRange(filters.value) + countRange(filters.pnl) + countRange(filters.pnlPercent)
    case 'outcome':
      return filters.outcome === 'all' ? 0 : 1
    case 'presence':
      return countTriState(filters.hasPrice) + countTriState(filters.hasNotes)
    default:
      return 0
  }
}

interface TriStateFieldProps {
  label: string
  value: TriState
  onChange: (value: TriState) => void
}

function TriStateField({ label, value, onChange }: TriStateFieldProps) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs font-medium tracking-wide text-on-surface-variant uppercase">
        {label}
      </span>
      <SegmentedControl
        value={value}
        onChange={onChange}
        ariaLabel={label}
        size="sm"
        options={[
          { value: 'any', label: t('filters.triState.any') },
          { value: 'has', label: t('filters.triState.has') },
          { value: 'missing', label: t('filters.triState.missing') },
        ]}
      />
    </div>
  )
}

export function PortfolioFilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  bounds,
}: PortfolioFilterSheetProps) {
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
          />
        )
      case 'market':
        return (
          <MultiSelectField
            label={t('fields.market')}
            value={filters.markets}
            options={marketOptions}
            onChange={(values) => onChange({ markets: values as Market[] })}
          />
        )
      case 'priceSize':
        return (
          <div className="flex flex-col gap-3">
            <RangeField
              label={t('filters.quantity')}
              value={filters.quantity}
              onChange={(quantity) => onChange({ quantity })}
              min={bounds.quantity.min}
              max={bounds.quantity.max}
              scale="log"
              format={formatNumber}
            />
            <RangeField
              label={t('filters.avgCost')}
              value={filters.avgCost}
              onChange={(avgCost) => onChange({ avgCost })}
              min={bounds.avgCost.min}
              max={bounds.avgCost.max}
              scale="log"
              format={formatPrice}
            />
            <RangeField
              label={t('filters.currentPrice')}
              value={filters.currentPrice}
              onChange={(currentPrice) => onChange({ currentPrice })}
              min={bounds.currentPrice.min}
              max={bounds.currentPrice.max}
              scale="log"
              format={formatPrice}
            />
          </div>
        )
      case 'performance':
        return (
          <div className="flex flex-col gap-3">
            <RangeField
              label={t('filters.value')}
              value={filters.value}
              onChange={(value) => onChange({ value })}
              min={bounds.value.min}
              max={bounds.value.max}
              scale="log"
              format={formatNumber}
            />
            <RangeField
              label={t('filters.pnl')}
              value={filters.pnl}
              onChange={(pnl) => onChange({ pnl })}
              min={bounds.pnl.min}
              max={bounds.pnl.max}
              format={formatNumber}
            />
            <RangeField
              label={t('filters.pnlPercent')}
              value={filters.pnlPercent}
              onChange={(pnlPercent) => onChange({ pnlPercent })}
              min={bounds.pnlPercent.min}
              max={bounds.pnlPercent.max}
              format={formatPercent}
            />
          </div>
        )
      case 'outcome':
        return (
          <SegmentedControl
            value={filters.outcome}
            onChange={(outcome) => onChange({ outcome })}
            ariaLabel={t('filters.sections.outcome')}
            options={[
              { value: 'all', label: t('filters.assetOutcome.all') },
              { value: 'gain', label: t('filters.assetOutcome.gain') },
              { value: 'loss', label: t('filters.assetOutcome.loss') },
              { value: 'breakeven', label: t('filters.assetOutcome.breakeven') },
            ]}
          />
        )
      case 'presence':
        return (
          <div className="flex flex-col gap-3">
            <TriStateField
              label={t('filters.hasPrice')}
              value={filters.hasPrice}
              onChange={(hasPrice) => onChange({ hasPrice })}
            />
            <TriStateField
              label={t('filters.hasNotes')}
              value={filters.hasNotes}
              onChange={(hasNotes) => onChange({ hasNotes })}
            />
          </div>
        )
      default:
        return null
    }
  }

  const sections: FilterSectionSpec[] = ASSET_FILTER_GROUPS.map((group) => ({
    id: group.id,
    title: t(group.labelKey),
    count: sectionCount(group.id, filters),
    children: controlFor(group.id),
  }))

  return <FilterSheet open={open} onClose={onClose} sections={sections} onClearAll={onReset} />
}
