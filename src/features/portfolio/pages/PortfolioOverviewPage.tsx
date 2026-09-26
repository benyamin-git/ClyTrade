import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { calculateAssetMetrics, calculatePortfolioTotals } from '@/calculations/portfolioMetrics'
import type { Asset } from '@/data/models/asset'
import { deleteAsset, listAssets } from '@/data/repositories/assets.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { formatCurrency, formatNumber, formatPercent, formatPrice } from '@/lib/format'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { DataTable, type Column } from '@/ui/components/DataTable'
import { EmptyState } from '@/ui/components/EmptyState'
import { IconButton } from '@/ui/components/IconButton'
import { Sheet } from '@/ui/components/Sheet'
import { Stat } from '@/ui/components/Stat'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { AssetFormSheet } from '../components/AssetFormSheet'

interface AssetRow {
  asset: Asset
  metrics: ReturnType<typeof calculateAssetMetrics>
}

export function PortfolioOverviewPage() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const assets = useLiveQuery(() => listAssets(), [], undefined)
  const rows = useMemo<AssetRow[]>(
    () =>
      (assets ?? []).map((asset) => ({
        asset,
        metrics: calculateAssetMetrics({
          quantity: asset.quantity,
          averageCost: asset.averageCost,
          currentPrice: asset.currentPrice,
        }),
      })),
    [assets],
  )

  const totals = useMemo(
    () =>
      calculatePortfolioTotals(
        (assets ?? []).map((asset) => ({
          quantity: asset.quantity,
          averageCost: asset.averageCost,
          currentPrice: asset.currentPrice,
        })),
      ),
    [assets],
  )

  const [form, setForm] = useState<{ asset: Asset | null } | null>(null)
  const [deleting, setDeleting] = useState<Asset | null>(null)

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
        <div className="flex-1" />
        <Button size="sm" icon={<Plus />} onClick={() => setForm({ asset: null })}>
          {t('portfolio.addAsset')}
        </Button>
      </div>

      <Card className="flex-1">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.asset.id}
          onRowClick={(row) => setForm({ asset: row.asset })}
          empty={
            <EmptyState
              title={t('portfolio.emptyTitle')}
              description={t('portfolio.emptyDescription')}
              action={
                <Button size="sm" icon={<Plus />} onClick={() => setForm({ asset: null })}>
                  {t('portfolio.addAsset')}
                </Button>
              }
            />
          }
        />
      </Card>

      {form ? <AssetFormSheet asset={form.asset} onClose={() => setForm(null)} /> : null}

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
