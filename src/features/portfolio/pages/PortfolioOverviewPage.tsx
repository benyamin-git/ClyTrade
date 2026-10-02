import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { calculatePortfolioTotals } from '@/calculations/portfolioMetrics'
import type { Asset } from '@/data/models/asset'
import { MARKET_IDS, type Market } from '@/data/models/market'
import { deleteAsset, listAssets } from '@/data/repositories/assets.repo'
import { FilterBar } from '@/features/filters/FilterBar'
import { activeGroupCount } from '@/features/filters/filterUtils'
import { useFilterState } from '@/features/filters/useFilterState'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { formatCurrency, formatNumber, formatPercent, formatPrice } from '@/lib/format'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { DataTable, type Column } from '@/ui/components/DataTable'
import { EmptyState } from '@/ui/components/EmptyState'
import { IconButton } from '@/ui/components/IconButton'
import { MultiSelectField } from '@/ui/components/MultiSelectField'
import { Sheet } from '@/ui/components/Sheet'
import { Stat } from '@/ui/components/Stat'
import { TextField } from '@/ui/components/TextField'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { AssetFormSheet } from '../components/AssetFormSheet'
import { PortfolioFilterSheet } from '../components/PortfolioFilterSheet'
import {
  ASSET_FILTER_GROUPS,
  DEFAULT_ASSET_FILTERS,
  assetNumericBounds,
  buildAssetChips,
  filterAssets,
  toAssetRows,
  type AssetRow,
} from '../logic/assetFilters'

export function PortfolioOverviewPage() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const assets = useLiveQuery(() => listAssets(), [], undefined)
  const rows = useMemo<AssetRow[]>(() => toAssetRows(assets ?? []), [assets])

  const { filters, patch, reset } = useFilterState(DEFAULT_ASSET_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<{ asset: Asset | null } | null>(null)
  const [deleting, setDeleting] = useState<Asset | null>(null)

  const filteredRows = useMemo(() => filterAssets(rows, filters), [rows, filters])
  const chips = useMemo(() => buildAssetChips(filters, t), [filters, t])
  const activeCount = activeGroupCount(filters, ASSET_FILTER_GROUPS)
  const bounds = useMemo(() => assetNumericBounds(rows), [rows])

  const totals = useMemo(
    () =>
      calculatePortfolioTotals(
        filteredRows.map((row) => ({
          quantity: row.asset.quantity,
          averageCost: row.asset.averageCost,
          currentPrice: row.asset.currentPrice,
        })),
      ),
    [filteredRows],
  )

  const columns: readonly Column<AssetRow>[] = [
    {
      key: 'symbol',
      header: t('portfolio.columns.asset'),
      render: (row) => (
        <span>
          <span className="font-medium">{row.asset.symbol}</span>
          {row.asset.name ? (
            <span className="ms-1.5 text-2xs text-on-surface-variant">{row.asset.name}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'market',
      header: t('fields.market'),
      render: (row) => (
        <span className="text-on-surface-variant">{t(`markets.${row.asset.market}`)}</span>
      ),
    },
    {
      key: 'quantity',
      header: t('portfolio.columns.quantity'),
      align: 'right',
      render: (row) => (
        <span className="tabular">
          {formatNumber(row.asset.quantity, { maximumFractionDigits: 8 })}
        </span>
      ),
    },
    {
      key: 'cost',
      header: t('portfolio.columns.avgCost'),
      align: 'right',
      render: (row) => <span className="tabular">{formatPrice(row.asset.averageCost)}</span>,
    },
    {
      key: 'price',
      header: t('portfolio.columns.price'),
      align: 'right',
      render: (row) => (
        <span className="tabular">
          {row.asset.currentPrice === null ? (
            <span className="text-on-surface-variant">{t('portfolio.atCost')}</span>
          ) : (
            formatPrice(row.asset.currentPrice)
          )}
        </span>
      ),
    },
    {
      key: 'value',
      header: t('portfolio.columns.value'),
      align: 'right',
      render: (row) => (
        <span className="tabular font-medium">
          {row.metrics ? formatCurrency(row.metrics.value, preferences.currency) : '—'}
        </span>
      ),
    },
    {
      key: 'pnl',
      header: t('portfolio.columns.pnl'),
      align: 'right',
      render: (row) => {
        const pnl = row.metrics?.pnl ?? null
        return (
          <span
            className={cn(
              'tabular',
              pnl === null ? 'text-on-surface-variant' : pnl >= 0 ? 'text-profit' : 'text-loss',
            )}
          >
            {pnl === null ? '—' : formatCurrency(pnl, preferences.currency)}
          </span>
        )
      },
    },
    {
      key: 'pnlPercent',
      header: t('portfolio.columns.pnlPercent'),
      align: 'right',
      render: (row) => {
        const pct = row.metrics?.pnlPercent ?? null
        return (
          <span
            className={cn(
              'tabular',
              pct === null ? 'text-on-surface-variant' : pct >= 0 ? 'text-profit' : 'text-loss',
            )}
          >
            {pct === null ? '—' : formatPercent(pct)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <span className="flex items-center justify-end gap-0.5">
          <IconButton
            label={t('portfolio.editAria', { symbol: row.asset.symbol })}
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              setForm({ asset: row.asset })
            }}
          >
            <Pencil />
          </IconButton>
          <IconButton
            label={t('portfolio.deleteAria', { symbol: row.asset.symbol })}
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              setDeleting(row.asset)
            }}
          >
            <Trash2 />
          </IconButton>
        </span>
      ),
    },
  ]

  return (
    <ViewportPage className="gap-3">
      <FilterBar
        chips={chips.map((chip) => ({
          id: chip.id,
          label: chip.label,
          onClear: () => patch(chip.clear(filters)),
        }))}
        activeCount={activeCount}
        onOpenFilters={() => setSheetOpen(true)}
        onClearAll={reset}
        trailing={
          <Button size="sm" icon={<Plus />} onClick={() => setForm({ asset: null })}>
            {t('portfolio.addAsset')}
          </Button>
        }
      >
        <TextField
          label={t('filters.sections.text')}
          value={filters.search}
          onChange={(search) => patch({ search })}
          placeholder={t('filters.assetSearchPlaceholder')}
          className="w-56"
        />
        <MultiSelectField
          label={t('fields.market')}
          value={filters.markets}
          options={MARKET_IDS.map((id) => ({ value: id, label: t(`markets.${id}`) }))}
          onChange={(markets) => patch({ markets: markets as Market[] })}
          className="w-56"
        />
      </FilterBar>

      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
        <Stat
          label={t('portfolio.stats.totalValue')}
          value={formatCurrency(totals.value, preferences.currency)}
        />
        <Stat
          label={t('portfolio.stats.unrealizedPnl')}
          value={formatCurrency(totals.pnl, preferences.currency)}
          tone={totals.pnl >= 0 ? 'profit' : 'loss'}
          hint={totals.pnlPercent === null ? undefined : formatPercent(totals.pnlPercent)}
        />
      </div>

      <Card className="flex-1">
        <DataTable
          columns={columns}
          rows={filteredRows}
          getRowKey={(row) => row.asset.id}
          onRowClick={(row) => setForm({ asset: row.asset })}
          empty={
            rows.length === 0 ? (
              <EmptyState
                title={t('portfolio.emptyTitle')}
                description={t('portfolio.emptyDescription')}
                action={
                  <Button size="sm" icon={<Plus />} onClick={() => setForm({ asset: null })}>
                    {t('portfolio.addAsset')}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title={t('filters.assetNoMatchTitle')}
                description={t('filters.assetNoMatchDescription')}
                action={
                  <Button size="sm" variant="outlined" onClick={reset}>
                    {t('filters.clearAll')}
                  </Button>
                }
              />
            )
          }
        />
      </Card>

      {form ? <AssetFormSheet asset={form.asset} onClose={() => setForm(null)} /> : null}

      <PortfolioFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={patch}
        onReset={reset}
        bounds={bounds}
      />

      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('portfolio.deleteTitle')}
        footer={
          <>
            <Button variant="text" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) void deleteAsset(deleting.id)
                setDeleting(null)
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {t('portfolio.deleteConfirm', { symbol: deleting?.symbol ?? '' })}
        </p>
      </Sheet>
    </ViewportPage>
  )
}
