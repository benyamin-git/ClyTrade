import { useMemo } from 'react'
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
import { usePreferences } from '@/features/settings/SettingsContext'
import { formatCompact, formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { Card } from '@/ui/components/Card'
import { EmptyState } from '@/ui/components/EmptyState'
import { Stat } from '@/ui/components/Stat'
import { ViewportPage } from '@/ui/layout/ViewportPage'

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
  const assets = useLiveQuery(() => listAssets(), [], undefined)
  const currency = preferences.currency

  const inputs = useMemo(
    () =>
      (assets ?? []).map((asset) => ({
        symbol: asset.symbol,
        quantity: asset.quantity,
        averageCost: asset.averageCost,
        currentPrice: asset.currentPrice,
      })),
    [assets],
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

  if (inputs.length === 0) {
    return (
      <ViewportPage>
        <Card className="flex-1">
          <EmptyState
            title="Nothing to analyze yet"
            description="Add assets in the Portfolio overview to see allocation and PnL."
          />
        </Card>
      </ViewportPage>
    )
  }

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <Card title="Portfolio">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-4 sm:grid-cols-4">
          <Stat label="Total value" value={formatCurrency(totals.value, currency)} size="lg" />
          <Stat label="Total cost" value={formatCurrency(totals.cost, currency)} />
          <Stat
            label="Unrealized PnL"
            value={formatCurrency(totals.pnl, currency)}
            tone={totals.pnl >= 0 ? 'profit' : 'loss'}
          />
          <Stat
            label="Return"
            value={totals.pnlPercent === null ? '—' : formatPercent(totals.pnlPercent)}
            tone={
              totals.pnlPercent === null ? 'default' : totals.pnlPercent >= 0 ? 'profit' : 'loss'
            }
            hint={`${totals.assets} ${totals.assets === 1 ? 'asset' : 'assets'}`}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Allocation">
          <div className="flex flex-col items-center gap-4 p-4 sm:flex-row">
            <div className="h-56 w-full sm:w-1/2">
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
                  <span className="tabular w-20 text-right">
                    {formatCurrency(slice.value, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card title="Unrealized PnL by asset">
          <div className="h-72 p-3">
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
                  formatter={(value) => [formatCurrency(Number(value), currency), 'PnL']}
                  cursor={{ fill: 'var(--md-sys-color-on-surface)', fillOpacity: 0.05 }}
                />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {pnlData.map((entry) => (
                    <Cell
                      key={entry.symbol}
                      fill={entry.pnl >= 0 ? 'var(--app-color-profit)' : 'var(--app-color-loss)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <p className="text-2xs text-on-surface-variant">
        Assets without a current price are valued at cost, so their PnL shows as{' '}
        {formatNumber(0, { maximumFractionDigits: 2 })}. Update prices in the overview to see live
        unrealized PnL.
      </p>
    </ViewportPage>
  )
}
