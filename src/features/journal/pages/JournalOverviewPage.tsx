import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Trade } from '@/data/models/trade'
import { deleteTrade, listTrades } from '@/data/repositories/trades.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
import { formatCurrency, formatNumber, formatPrice } from '@/lib/format'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { DataTable, type Column } from '@/ui/components/DataTable'
import { EmptyState } from '@/ui/components/EmptyState'
import { IconButton } from '@/ui/components/IconButton'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { TradeFormSheet } from '../components/TradeFormSheet'
import { toTradeRows, type TradeRow } from '../logic/tradeRows'

type TradeFilter = 'all' | 'open' | 'closed'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
] as const

export function JournalOverviewPage() {
  const { preferences } = usePreferences()
  const trades = useLiveQuery(() => listTrades(), [], undefined)
  const rows = useMemo(
    () => toTradeRows(trades ?? [], preferences.feesInRisk),
    [trades, preferences.feesInRisk],
  )
  const [filter, setFilter] = useState<TradeFilter>('all')
  const [form, setForm] = useState<{ trade: Trade | null } | null>(null)
  const [deleting, setDeleting] = useState<Trade | null>(null)

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (filter === 'open') return row.trade.closedAt === null
        if (filter === 'closed') return row.trade.closedAt !== null
        return true
      }),
    [rows, filter],
  )

  const columns: readonly Column<TradeRow>[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      render: (row) => (
        <span className="font-medium">
          {row.trade.symbol}
          {row.trade.tags.length > 0 ? (
            <span className="ml-1.5 text-2xs text-on-surface-variant">
              {row.trade.tags.map((tag) => `#${tag}`).join(' ')}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'Side',
      render: (row) => (
        <span className={row.trade.direction === 'long' ? 'text-profit' : 'text-loss'}>
          {row.trade.direction === 'long' ? 'Long' : 'Short'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={cn(
            'rounded-app-full px-1.5 py-0.5 text-2xs font-medium',
            row.trade.closedAt === null
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-high text-on-surface-variant',
          )}
        >
          {row.trade.closedAt === null ? 'Open' : 'Closed'}
        </span>
      ),
    },
    {
      key: 'entry',
      header: 'Entry',
      align: 'right',
      render: (row) => <span className="tabular">{formatPrice(row.trade.entryPrice)}</span>,
    },
    {
      key: 'exit',
      header: 'Exit',
      align: 'right',
      render: (row) => (
        <span className="tabular">
          {row.trade.exitPrice === null ? '—' : formatPrice(row.trade.exitPrice)}
        </span>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      align: 'right',
      render: (row) => (
        <span className="tabular">
          {formatNumber(row.trade.size, { maximumFractionDigits: 6 })}
        </span>
      ),
    },
    {
      key: 'pnl',
      header: 'Net PnL',
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
      header: 'R',
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
            {r === null ? '—' : `${formatNumber(r, { maximumFractionDigits: 2 })}R`}
          </span>
        )
      },
    },
    {
      key: 'opened',
      header: 'Opened',
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
            label={`Edit ${row.trade.symbol}`}
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              setForm({ trade: row.trade })
            }}
          >
            <Pencil />
          </IconButton>
          <IconButton
            label={`Delete ${row.trade.symbol}`}
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
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <SegmentedControl value={filter} options={filterOptions} onChange={setFilter} size="sm" />
        <span className="text-xs text-on-surface-variant">
          {filtered.length} {filtered.length === 1 ? 'trade' : 'trades'}
        </span>
        <div className="flex-1" />
        <Button size="sm" icon={<Plus />} onClick={() => setForm({ trade: null })}>
          Add trade
        </Button>
      </div>

      <Card className="flex-1">
        <DataTable
          columns={columns}
          rows={filtered}
          getRowKey={(row) => row.trade.id}
          onRowClick={(row) => setForm({ trade: row.trade })}
          empty={
            <EmptyState
              title="No trades yet"
              description="Add your first futures trade to start building the journal."
              action={
                <Button size="sm" icon={<Plus />} onClick={() => setForm({ trade: null })}>
                  Add trade
                </Button>
              }
            />
          }
        />
      </Card>

      {form ? <TradeFormSheet trade={form.trade} onClose={() => setForm(null)} /> : null}

      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete trade"
        footer={
          <>
            <Button variant="text" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) void deleteTrade(deleting.id)
                setDeleting(null)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Delete <span className="font-medium">{deleting?.symbol}</span>? This cannot be undone.
        </p>
      </Sheet>
    </ViewportPage>
  )
}
