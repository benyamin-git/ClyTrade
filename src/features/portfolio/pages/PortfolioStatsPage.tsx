import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildAllocation,
  calculateAssetMetrics,
  calculatePortfolioTotals,
} from '@/calculations/portfolioMetrics'
import { listAssets } from '@/data/repositories/assets.repo'
import { MARKET_IDS, type Market } from '@/data/models/market'
import { FilterBar } from '@/features/filters/FilterBar'
import { activeGroupCount } from '@/features/filters/filterUtils'
import { useFilterState } from '@/features/filters/useFilterState'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { formatCompact, formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { EmptyState } from '@/ui/components/EmptyState'
import { MultiSelectField } from '@/ui/components/MultiSelectField'
import { Stat } from '@/ui/components/Stat'
import { TextField } from '@/ui/components/TextField'
import { ViewportPage } from '@/ui/layout/ViewportPage'
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

const PIE_COLORS = [
  'var(--md-sys-color-primary)',
  'var(--md-sys-color-tertiary)',
  'var(--md-sys-color-secondary)',
  'var(--app-color-profit)',
  'var(--app-color-warning)',
  'var(--md-sys-color-primary-container)',
  'var(--md-sys-color-tertiary-container)',
  'var(--md-sys-color-secondary-container)',
]

function pieColor(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length] ?? 'var(--md-sys-color-primary)'
}

const tooltipStyle = {
  backgroundColor: 'var(--md-sys-color-surface-container-high)',
  border: '1px solid var(--md-sys-color-outline-variant)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--md-sys-color-on-surface)',
} as const

export function PortfolioStatsPage() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const assets = useLiveQuery(() => listAssets(), [], undefined)
  const currency = preferences.currency

  const rows = useMemo<AssetRow[]>(() => toAssetRows(assets ?? []), [assets])
  const { filters, patch, reset } = useFilterState(DEFAULT_ASSET_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filteredRows = useMemo(() => filterAssets(rows, filters), [rows, filters])
  const chips = useMemo(() => buildAssetChips(filters, t), [filters, t])
  const activeCount = activeGroupCount(filters, ASSET_FILTER_GROUPS)
  const bounds = useMemo(() => assetNumericBounds(rows), [rows])

  const inputs = useMemo(
    () =>
      filteredRows.map(({ asset }) => ({
        symbol: asset.symbol,
        quantity: asset.quantity,
        averageCost: asset.averageCost,
        currentPrice: asset.currentPrice,
      })),
    [filteredRows],
  )

  const totals = useMemo(() => calculatePortfolioTotals(inputs), [inputs])
  const allocation = useMemo(() => buildAllocation(inputs), [inputs])

  const allocationData = useMemo(
    () =>
      allocation.map((slice) => ({
        name: inputs[slice.index]?.symbol ?? '—',
        value: slice.value,
        sharePercent: slice.sharePercent,
      })),
    [allocation, inputs],
  )

  const pnlData = useMemo(
    () =>
      inputs.map((asset) => {
        const metrics = calculateAssetMetrics(asset)
        return { symbol: asset.symbol, pnl: metrics?.pnl ?? 0 }
      }),
    [inputs],
  )

  const filterBar = (
    <FilterBar
      chips={chips.map((chip) => ({
        id: chip.id,
        label: chip.label,
        onClear: () => patch(chip.clear(filters)),
      }))}
      activeCount={activeCount}
      onOpenFilters={() => setSheetOpen(true)}
      onClearAll={reset}
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
  )

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      {filterBar}
      {rows.length === 0 ? (
        <Card className="flex-1">
          <EmptyState
            title={t('portfolio.stats.nothingToAnalyzeTitle')}
            description={t('portfolio.stats.nothingToAnalyzeDescription')}
          />
        </Card>
      ) : filteredRows.length === 0 ? (
        <Card className="flex-1">
          <EmptyState
            title={t('filters.assetNoMatchTitle')}
            description={t('filters.assetNoMatchDescription')}
            action={
              <Button size="sm" variant="outlined" onClick={reset}>
                {t('filters.clearAll')}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card title={t('portfolio.stats.portfolio')}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-4 sm:grid-cols-4">
              <Stat
                label={t('portfolio.stats.totalValue')}
                value={formatCurrency(totals.value, currency)}
                size="lg"
              />
              <Stat
                label={t('portfolio.stats.totalCost')}
                value={formatCurrency(totals.cost, currency)}
              />
              <Stat
                label={t('portfolio.stats.unrealizedPnl')}
                value={formatCurrency(totals.pnl, currency)}
                tone={totals.pnl >= 0 ? 'profit' : 'loss'}
              />
              <Stat
                label={t('portfolio.stats.return')}
                value={totals.pnlPercent === null ? '—' : formatPercent(totals.pnlPercent)}
                tone={
                  totals.pnlPercent === null
                    ? 'default'
                    : totals.pnlPercent >= 0
                      ? 'profit'
                      : 'loss'
                }
                hint={t('portfolio.stats.assetCount', { count: totals.assets })}
              />
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t('portfolio.stats.allocation')}>
              <div className="flex flex-col items-center gap-4 p-4 sm:flex-row">
                <div className="h-56 w-full sm:w-1/2" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColor(index)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [
                          formatCurrency(Number(value), currency),
                          String(name),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex w-full flex-col gap-1 sm:w-1/2">
                  {allocationData.map((slice, index) => (
                    <li key={slice.name} className="flex items-center gap-2 text-sm">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: pieColor(index) }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{slice.name}</span>
                      <span className="tabular text-on-surface-variant">
                        {formatPercent(slice.sharePercent, 1)}
                      </span>
                      <span className="tabular w-20 text-end">
                        {formatCurrency(slice.value, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card title={t('portfolio.stats.pnlByAsset')}>
              <div className="h-72 p-3" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--md-sys-color-outline-variant)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="symbol"
                      tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }}
                      stroke="var(--md-sys-color-outline-variant)"
                    />
                    <YAxis
                      tickFormatter={(value) => formatCompact(Number(value))}
                      tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }}
                      stroke="var(--md-sys-color-outline-variant)"
                      width={52}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [
                        formatCurrency(Number(value), currency),
                        t('portfolio.stats.pnl'),
                      ]}
                      cursor={{ fill: 'var(--md-sys-color-on-surface)', fillOpacity: 0.05 }}
                    />
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                      {pnlData.map((entry) => (
                        <Cell
                          key={entry.symbol}
                          fill={
                            entry.pnl >= 0 ? 'var(--app-color-profit)' : 'var(--app-color-loss)'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <p className="text-2xs text-on-surface-variant">
            {t('portfolio.stats.valuationNote', {
              zero: formatNumber(0, { maximumFractionDigits: 2 }),
            })}
          </p>
        </>
      )}

      <PortfolioFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={patch}
        onReset={reset}
        bounds={bounds}
      />
    </ViewportPage>
  )
}
