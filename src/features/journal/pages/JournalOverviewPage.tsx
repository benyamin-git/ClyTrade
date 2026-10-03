import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Trade } from '@/data/models/trade'
import { deleteTrade, listTrades } from '@/data/repositories/trades.repo'
import { FilterBar } from '@/features/filters/FilterBar'
import { activeGroupCount } from '@/features/filters/filterUtils'
import { useFilterState } from '@/features/filters/useFilterState'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { formatCurrency, formatNumber, formatPrice } from '@/lib/format'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { DataTable, type Column } from '@/ui/components/DataTable'
import { EmptyState } from '@/ui/components/EmptyState'
import { IconButton } from '@/ui/components/IconButton'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { JournalFilterSheet } from '../components/JournalFilterSheet'
import { TradeFormSheet } from '../components/TradeFormSheet'
import {
  DEFAULT_TRADE_FILTERS,
  TRADE_FILTER_GROUPS,
  filterTrades,
  tradeNumericBounds,
  tradeStrategyOptions,
  tradeTagOptions,
} from '../logic/tradeFilters'
import { toTradeRows, type TradeRow } from '../logic/tradeRows'

export function JournalOverviewPage() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const trades = useLiveQuery(() => listTrades(), [], undefined)
  const rows = useMemo(
    () => toTradeRows(trades ?? [], preferences.feesInRisk),
    [trades, preferences.feesInRisk],
  )
  const { filters, patch, reset } = useFilterState(DEFAULT_TRADE_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<{ trade: Trade | null } | null>(null)
  const [deleting, setDeleting] = useState<Trade | null>(null)

  const filtered = useMemo(() => filterTrades(rows, filters), [rows, filters])
  const activeCount = activeGroupCount(filters, TRADE_FILTER_GROUPS)
  const tagOptions = useMemo(() => tradeTagOptions(trades ?? []), [trades])
  const strategyOptions = useMemo(() => tradeStrategyOptions(trades ?? []), [trades])
  const bounds = useMemo(() => tradeNumericBounds(rows), [rows])

  const columns: readonly Column<TradeRow>[] = [
    {
      key: 'symbol',
      header: t('journal.columns.symbol'),
      render: (row) => (
        <span className="font-medium">
          {row.trade.symbol}
          {row.trade.tags.length > 0 ? (
            <span className="ms-1.5 text-2xs text-on-surface-variant">
              {row.trade.tags.map((tag) => `#${tag}`).join(' ')}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'market',
      header: t('fields.market'),
      render: (row) => (
        <span className="text-on-surface-variant">{t(`markets.${row.trade.market}`)}</span>
      ),
    },
    {
      key: 'direction',
      header: t('journal.columns.side'),
      render: (row) => (
        <span className={row.trade.direction === 'long' ? 'text-profit' : 'text-loss'}>
          {row.trade.direction === 'long' ? t('direction.long') : t('direction.short')}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('journal.columns.status'),
      render: (row) => (
        <span
          className={cn(
            'rounded-app-full px-1.5 py-0.5 text-2xs font-medium',
            row.trade.closedAt === null
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-high text-on-surface-variant',
          )}
        >
          {row.trade.closedAt === null ? t('status.open') : t('status.closed')}
        </span>
      ),
    },
    {
      key: 'entry',
      header: t('journal.columns.entry'),
      align: 'right',
      render: (row) => <span className="tabular">{formatPrice(row.trade.entryPrice)}</span>,
    },
    {
      key: 'exit',
      header: t('journal.columns.exit'),
      align: 'right',
      render: (row) => (
        <span className="tabular">
          {row.trade.exitPrice === null ? '—' : formatPrice(row.trade.exitPrice)}
        </span>
      ),
    },
    {
      key: 'size',
      header: t('journal.columns.size'),
      align: 'right',
      render: (row) => (
        <span className="tabular">
          {formatNumber(row.trade.size, { maximumFractionDigits: 6 })}
        </span>
      ),
    },
    {
      key: 'pnl',
      header: t('journal.columns.netPnl'),
      align: 'right',
      render: (row) => {
        const pnl = row.metrics?.netPnl ?? null
        return (
          <span
            className={cn(
              'tabular font-medium',
              pnl === null ? 'text-on-surface-variant' : pnl >= 0 ? 'text-profit' : 'text-loss',
            )}
          >
            {pnl === null ? '—' : formatCurrency(pnl, preferences.currency)}
          </span>
        )
      },
    },
    {
      key: 'r',
      header: t('journal.columns.r'),
      align: 'right',
      render: (row) => {
        const r = row.metrics?.rMultiple ?? null
        return (
          <span
            className={cn(
              'tabular',
              r === null ? 'text-on-surface-variant' : r >= 0 ? 'text-profit' : 'text-loss',
            )}
          >
            {r === null
              ? '—'
              : t('journal.rValue', { value: formatNumber(r, { maximumFractionDigits: 2 }) })}
          </span>
        )
      },
    },
    {
      key: 'opened',
      header: t('journal.columns.opened'),
      align: 'right',
      render: (row) => (
        <span className="text-on-surface-variant">{formatDate(row.trade.openedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <span className="flex items-center justify-end gap-0.5">
          <IconButton
            label={t('journal.editAria', { symbol: row.trade.symbol })}
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              setForm({ trade: row.trade })
            }}
          >
            <Pencil />
          </IconButton>
          <IconButton
            label={t('journal.deleteAria', { symbol: row.trade.symbol })}
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              setDeleting(row.trade)
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
        activeCount={activeCount}
        onOpenFilters={() => setSheetOpen(true)}
        trailing={
          <div className="flex items-center gap-3">
            <span className="text-xs text-on-surface-variant">
              {t('journal.tradeCount', { count: filtered.length })}
            </span>
            <Button size="sm" icon={<Plus />} onClick={() => setForm({ trade: null })}>
              {t('journal.addTrade')}
            </Button>
          </div>
        }
      />

      <Card className="flex-1">
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(row) => row.trade.id}
          onRowClick={(row) => setForm({ trade: row.trade })}
          empty={
            rows.length === 0 ? (
              <EmptyState
                title={t('journal.emptyTitle')}
                description={t('journal.emptyDescription')}
                action={
                  <Button size="sm" icon={<Plus />} onClick={() => setForm({ trade: null })}>
                    {t('journal.addTrade')}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title={t('filters.noMatchTitle')}
                description={t('filters.noMatchDescription')}
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

      {form ? <TradeFormSheet trade={form.trade} onClose={() => setForm(null)} /> : null}

      <JournalFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={patch}
        onReset={reset}
        tagOptions={tagOptions}
        strategyOptions={strategyOptions}
        bounds={bounds}
        variant="overview"
      />

      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('journal.deleteTitle')}
        footer={
          <>
            <Button variant="text" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) void deleteTrade(deleting.id)
                setDeleting(null)
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm">{t('journal.deleteConfirm', { symbol: deleting?.symbol ?? '' })}</p>
      </Sheet>
    </ViewportPage>
  )
}
