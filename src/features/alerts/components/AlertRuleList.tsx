import {
  ArrowLeftRight,
  ArrowUpDown,
  Bell,
  Pause,
  Pencil,
  Play,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { useI18n } from '@/i18n/I18nContext'
import type { Translator } from '@/i18n/translate'
import { formatDate, formatTime } from '@/lib/dates'
import { formatPercent, formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'
import { priceKeyFor, type ProviderPrice } from '@/market/types'
import { EmptyState } from '@/ui/components/EmptyState'
import { IconButton } from '@/ui/components/IconButton'

export interface AlertRuleListProps {
  rules: readonly PriceAlert[]
  trades: readonly Trade[]
  prices: ReadonlyMap<string, ProviderPrice>
  onEdit: (rule: PriceAlert) => void
  onDelete: (rule: PriceAlert) => void
  onToggle: (rule: PriceAlert) => void
  onEditTrade: (trade: Trade) => void
}

function repeatLabel(rule: PriceAlert, t: Translator): string {
  if (rule.repeat === 'cross-back') return t('alerts.form.repeats.crossBack')
  if (rule.repeat === 'cooldown') return t('alerts.form.repeats.cooldown')
  return t('alerts.form.repeats.once')
}

function lastFiredLabel(rule: PriceAlert, t: Translator): string {
  if (rule.lastFiredAt === null) return t('alerts.rules.neverFired')
  return t('alerts.rules.lastFired', {
    time: `${formatDate(rule.lastFiredAt)} · ${formatTime(rule.lastFiredAt)}`,
  })
}

function tradePriceUnavailable(trade: Trade): boolean {
  if (trade.market !== 'crypto') return true
  return trade.binanceSymbol === null && trade.coingeckoId === null
}

function tradeSummary(trade: Trade, t: Translator): string {
  const target = trade.targetPrice === null ? null : formatPrice(trade.targetPrice)
  const stop = trade.stopPrice === null ? null : formatPrice(trade.stopPrice)
  if (target !== null && stop !== null) {
    return t('alerts.rules.tradeLevels', { target, stop })
  }
  if (target !== null) return t('alerts.rules.tradeTarget', { level: target })
  if (stop !== null) return t('alerts.rules.tradeStop', { level: stop })
  return ''
}

function ruleModeLabel(rule: PriceAlert, t: Translator): string {
  if (rule.kind === 'percent') {
    if (rule.percentDirection === 'down') return t('alerts.form.directions.down')
    if (rule.percentDirection === 'both') return t('alerts.form.directions.both')
    return t('alerts.form.directions.up')
  }
  if (rule.priceMode === 'below') return t('alerts.form.modes.below')
  if (rule.priceMode === 'crossing') return t('alerts.form.modes.crossing')
  if (rule.priceMode === 'range') return t('alerts.form.modes.range')
  return t('alerts.form.modes.above')
}

function ruleCaption(rule: PriceAlert, t: Translator): string {
  if (rule.kind === 'percent') return t('alerts.form.percent')
  if (rule.priceMode === 'range') return t('alerts.form.modes.range')
  return t('alerts.form.level')
}

function ruleValue(rule: PriceAlert, t: Translator): string {
  if (rule.kind === 'percent') {
    return rule.percent === null ? '—' : formatPercent(rule.percent)
  }
  if (rule.priceMode === 'range') {
    const low = rule.rangeLow === null ? '—' : formatPrice(rule.rangeLow)
    const high = rule.rangeHigh === null ? '—' : formatPrice(rule.rangeHigh)
    return t('alerts.rules.rangeValue', { low, high })
  }
  return rule.level === null ? '—' : formatPrice(rule.level)
}

function ruleIcon(rule: PriceAlert): ReactNode {
  if (rule.kind === 'percent') {
    if (rule.percentDirection === 'down') return <TrendingDown />
    if (rule.percentDirection === 'both') return <ArrowUpDown />
    return <TrendingUp />
  }
  if (rule.priceMode === 'below') return <TrendingDown />
  if (rule.priceMode === 'crossing') return <ArrowLeftRight />
  if (rule.priceMode === 'range') return <ArrowUpDown />
  return <TrendingUp />
}

function distancePercent(rule: PriceAlert, price: number): number | null {
  if (price <= 0) return null
  if (rule.kind === 'percent') {
    if (rule.referencePrice === null || rule.percent === null) return null
    const targets: number[] = []
    if (rule.percentDirection !== 'down')
      targets.push(rule.referencePrice * (1 + rule.percent / 100))
    if (rule.percentDirection !== 'up') targets.push(rule.referencePrice * (1 - rule.percent / 100))
    if (targets.length === 0) return null
    const nearest = Math.min(...targets.map((target) => Math.abs(target - price)))
    return (nearest / price) * 100
  }
  if (rule.priceMode === 'range') {
    if (rule.rangeLow === null || rule.rangeHigh === null) return null
    if (price < rule.rangeLow) return ((rule.rangeLow - price) / price) * 100
    if (price > rule.rangeHigh) return ((price - rule.rangeHigh) / price) * 100
    return 0
  }
  if (rule.level === null) return null
  return (Math.abs(rule.level - price) / price) * 100
}

function tradeDistancePercent(trade: Trade, price: number): number | null {
  const level = trade.targetPrice ?? trade.stopPrice
  if (level === null || price <= 0) return null
  return (Math.abs(level - price) / price) * 100
}

interface CurrentPriceProps {
  price: number | null
  distance: number | null
}

function CurrentPrice({ price, distance }: CurrentPriceProps) {
  const { t } = useI18n()
  if (price === null) return null
  return (
    <div className="shrink-0 text-end">
      <p className="text-2xs font-medium tracking-wide text-on-surface-variant uppercase">
        {t('alerts.rules.current')}
      </p>
      <p className="tabular text-sm font-medium text-on-surface">{formatPrice(price)}</p>
      {distance === null ? null : (
        <p className="tabular text-2xs text-on-surface-variant">
          {t('alerts.rules.distance', { percent: formatPercent(distance) })}
        </p>
      )}
    </div>
  )
}

export function AlertRuleList({
  rules,
  trades,
  prices,
  onEdit,
  onDelete,
  onToggle,
  onEditTrade,
}: AlertRuleListProps) {
  const { t } = useI18n()
  const tradeRows = trades.filter(
    (trade) => trade.status === 'open' && (trade.targetPrice !== null || trade.stopPrice !== null),
  )

  if (rules.length === 0 && tradeRows.length === 0) {
    return (
      <EmptyState
        icon={<Bell />}
        title={t('alerts.rules.emptyTitle')}
        description={t('alerts.rules.emptyDescription')}
      />
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {rules.map((rule) => {
        const marketPrice = prices.get(priceKeyFor(rule))?.price ?? null
        return (
          <li key={rule.id}>
            <article
              className={cn(
                'flex h-full flex-col gap-3 rounded-app-md border bg-surface-container-low p-4',
                rule.enabled ? 'border-outline-variant/60' : 'border-outline-variant/40 opacity-75',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-app-sm [&>svg]:size-5',
                    rule.enabled
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {ruleIcon(rule)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-on-surface">
                      {rule.symbol}
                    </p>
                    <span className="rounded-app-full bg-surface-container-high px-2 py-0.5 text-2xs font-medium text-on-surface-variant">
                      {ruleModeLabel(rule, t)}
                    </span>
                    {rule.enabled ? null : (
                      <span className="rounded-app-full bg-surface-container-highest px-2 py-0.5 text-2xs font-medium text-on-surface-variant">
                        {t('alerts.rules.paused')}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-on-surface-variant">
                    {t('alerts.rules.repeat', { mode: repeatLabel(rule, t) })}
                  </p>
                </div>
                <div className="-me-2 flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label={
                      rule.enabled
                        ? t('alerts.rules.pauseAria', { symbol: rule.symbol })
                        : t('alerts.rules.resumeAria', { symbol: rule.symbol })
                    }
                    size="sm"
                    onClick={() => onToggle(rule)}
                  >
                    {rule.enabled ? <Pause /> : <Play />}
                  </IconButton>
                  <IconButton
                    label={t('alerts.rules.editAria', { symbol: rule.symbol })}
                    size="sm"
                    onClick={() => onEdit(rule)}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    label={t('alerts.rules.deleteAria', { symbol: rule.symbol })}
                    size="sm"
                    onClick={() => onDelete(rule)}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-2xs font-medium tracking-wide text-on-surface-variant uppercase">
                    {ruleCaption(rule, t)}
                  </p>
                  <p className="tabular truncate text-2xl font-semibold text-on-surface">
                    {ruleValue(rule, t)}
                  </p>
                </div>
                <CurrentPrice
                  price={marketPrice}
                  distance={marketPrice === null ? null : distancePercent(rule, marketPrice)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-outline-variant/40 pt-2.5 text-2xs text-on-surface-variant">
                <span>{lastFiredLabel(rule, t)}</span>
                {rule.referencePrice === null ? null : (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t('alerts.rules.reference', { price: formatPrice(rule.referencePrice) })}
                    </span>
                  </>
                )}
              </div>
            </article>
          </li>
        )
      })}

      {tradeRows.map((trade) => {
        const marketPrice = prices.get(priceKeyFor(trade))?.price ?? null
        return (
          <li key={trade.id}>
            <article className="flex h-full flex-col gap-3 rounded-app-md border border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-app-sm bg-secondary-container text-on-secondary-container [&>svg]:size-5"
                >
                  {trade.direction === 'short' ? <TrendingDown /> : <TrendingUp />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-on-surface">
                      {trade.symbol}
                    </p>
                    <span className="rounded-app-full bg-surface-container-high px-2 py-0.5 text-2xs font-medium text-on-surface-variant">
                      {t('alerts.rules.tradeBadge')}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {trade.direction === 'short' ? t('direction.short') : t('direction.long')}
                  </p>
                </div>
                <div className="-me-2 flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label={t('alerts.rules.tradeEditAria', { symbol: trade.symbol })}
                    size="sm"
                    onClick={() => onEditTrade(trade)}
                  >
                    <Pencil />
                  </IconButton>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="min-w-0 text-base font-medium text-on-surface">
                  {tradeSummary(trade, t)}
                </p>
                <CurrentPrice
                  price={marketPrice}
                  distance={marketPrice === null ? null : tradeDistancePercent(trade, marketPrice)}
                />
              </div>

              {tradePriceUnavailable(trade) ? (
                <p className="text-2xs text-on-surface-variant">
                  {t('alerts.rules.priceUnavailable')}
                </p>
              ) : null}
            </article>
          </li>
        )
      })}
    </ul>
  )
}
