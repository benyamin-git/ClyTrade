import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildEquityCurve, calculateJournalStats } from '@/calculations/journalStats'
import { listTrades } from '@/data/repositories/trades.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { isWithinRange, TIME_RANGES, type TimeRange } from '@/lib/dates'
import { formatDate } from '@/lib/dates'
import { formatCompact, formatCurrency, formatNumber } from '@/lib/format'
import { Card } from '@/ui/components/Card'
import { EmptyState } from '@/ui/components/EmptyState'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Stat } from '@/ui/components/Stat'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { toTradeRows } from '../logic/tradeRows'

const tooltipStyle = {
  backgroundColor: 'var(--md-sys-color-surface-container-high)',
  border: '1px solid var(--md-sys-color-outline-variant)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--md-sys-color-on-surface)',
} as const

export function JournalStatsPage() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const [range, setRange] = useState<TimeRange>(preferences.defaultTimeRange)
  const trades = useLiveQuery(() => listTrades(), [], undefined)

  const rows = useMemo(() => {
    const all = toTradeRows(trades ?? [], preferences.feesInRisk)
    return all.filter(
      (row) => row.trade.closedAt !== null && isWithinRange(row.trade.closedAt, range),
    )
  }, [trades, range, preferences.feesInRisk])

  const statsRows = useMemo(
    () =>
      rows.map((row) => ({
        netPnl: row.metrics?.netPnl ?? null,
        rMultiple: row.metrics?.rMultiple ?? null,
        closedAt: row.trade.closedAt,
      })),
    [rows],
  )

  const stats = useMemo(() => calculateJournalStats(statsRows), [statsRows])
  const curve = useMemo(() => buildEquityCurve(statsRows), [statsRows])
  const pnlBars = useMemo(
    () => curve.map((point, index) => ({ index: index + 1, pnl: point.pnl })),
    [curve],
  )

  const currency = preferences.currency

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <SegmentedControl
          value={range}
          options={TIME_RANGES.map((id) => ({ value: id, label: t(`timeRange.${id}`) }))}
          onChange={setRange}
          size="sm"
          className="no-scrollbar max-w-full overflow-x-auto"
        />
        <span className="text-xs text-on-surface-variant">
          {t('journal.stats.closedOpen', { closed: stats.closed, open: stats.open })}
        </span>
      </div>

      {stats.closed === 0 ? (
        <Card className="flex-1">
          <EmptyState
            title={t('journal.stats.emptyTitle')}
            description={t('journal.stats.emptyDescription')}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card title={t('journal.stats.performance')}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat
                label={t('calc.feesPnl.netPnl')}
                value={formatCurrency(stats.netPnl, currency)}
                tone={stats.netPnl >= 0 ? 'profit' : 'loss'}
                size="lg"
              />
              <Stat
                label={t('journal.stats.winRate')}
                value={
                  stats.winRatePercent === null
                    ? '—'
                    : `${formatNumber(stats.winRatePercent, { maximumFractionDigits: 1 })}%`
                }
                hint={t('journal.stats.winRateHint', {
                  losses: stats.losses,
                  wins: stats.wins,
                })}
              />
              <Stat
                label={t('journal.stats.profitFactor')}
                value={
                  stats.profitFactor === null
                    ? '—'
                    : formatNumber(stats.profitFactor, { maximumFractionDigits: 2 })
                }
                tone={stats.profitFactor !== null && stats.profitFactor >= 1 ? 'profit' : 'loss'}
              />
              <Stat
                label={t('journal.stats.averageR')}
                value={
                  stats.averageR === null
                    ? '—'
                    : `${formatNumber(stats.averageR, { maximumFractionDigits: 2 })}R`
                }
                tone={stats.averageR !== null && stats.averageR >= 0 ? 'profit' : 'loss'}
              />
              <Stat
                label={t('journal.stats.averageWinLoss')}
                value={`${stats.averageWin === null ? '—' : formatCompact(stats.averageWin)} / ${stats.averageLoss === null ? '—' : formatCompact(stats.averageLoss)}`}
              />
              <Stat
                label={t('journal.stats.bestWorst')}
                value={`${stats.bestTrade === null ? '—' : formatCompact(stats.bestTrade)} / ${stats.worstTrade === null ? '—' : formatCompact(stats.worstTrade)}`}
              />
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t('journal.stats.equityCurve')}>
              <div className="h-72 p-3" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={curve} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--md-sys-color-primary)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--md-sys-color-primary)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--md-sys-color-outline-variant)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(value) => formatDate(Number(value))}
                      tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }}
                      stroke="var(--md-sys-color-outline-variant)"
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCompact(Number(value))}
                      tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontSize: 11 }}
                      stroke="var(--md-sys-color-outline-variant)"
                      width={52}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(value) => formatDate(Number(value))}
                      formatter={(value) => [
                        formatCurrency(Number(value), currency),
                        t('journal.stats.cumulativePnl'),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="var(--md-sys-color-primary)"
                      strokeWidth={2}
                      fill="url(#equityFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={t('journal.stats.pnlPerTrade')}>
              <div className="h-72 p-3" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlBars} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--md-sys-color-outline-variant)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="index"
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
                      labelFormatter={(value) =>
                        t('journal.stats.tradeNumber', { index: String(value) })
                      }
                      formatter={(value) => [
                        formatCurrency(Number(value), currency),
                        t('calc.feesPnl.netPnl'),
                      ]}
                      cursor={{ fill: 'var(--md-sys-color-on-surface)', fillOpacity: 0.05 }}
                    />
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                      {pnlBars.map((bar) => (
                        <Cell
                          key={bar.index}
                          fill={bar.pnl >= 0 ? 'var(--app-color-profit)' : 'var(--app-color-loss)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </ViewportPage>
  )
}
