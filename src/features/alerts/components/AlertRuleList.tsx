import { Bell, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import type { PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { useI18n } from '@/i18n/I18nContext'
import type { Translator } from '@/i18n/translate'
import { formatDate, formatTime } from '@/lib/dates'
import { formatPercent, formatPrice } from '@/lib/format'
import { EmptyState } from '@/ui/components/EmptyState'
import { IconButton } from '@/ui/components/IconButton'

export interface AlertRuleListProps {
  rules: readonly PriceAlert[]
  trades: readonly Trade[]
  onEdit: (rule: PriceAlert) => void
  onDelete: (rule: PriceAlert) => void
  onToggle: (rule: PriceAlert) => void
  onEditTrade: (trade: Trade) => void
}

function ruleSummary(rule: PriceAlert, t: Translator): string {
  if (rule.kind === 'percent') {
    const percent = rule.percent === null ? '—' : formatPercent(rule.percent)
    if (rule.percentDirection === 'down') return t('alerts.rules.summary.percentDown', { percent })
    if (rule.percentDirection === 'both') return t('alerts.rules.summary.percentBoth', { percent })
    return t('alerts.rules.summary.percentUp', { percent })
  }

  if (rule.priceMode === 'range') {
    return t('alerts.rules.summary.range', {
      low: rule.rangeLow === null ? '—' : formatPrice(rule.rangeLow),
      high: rule.rangeHigh === null ? '—' : formatPrice(rule.rangeHigh),
    })
  }

  const level = rule.level === null ? '—' : formatPrice(rule.level)
  if (rule.priceMode === 'below') return t('alerts.rules.summary.below', { level })
  if (rule.priceMode === 'crossing') return t('alerts.rules.summary.crossing', { level })
  return t('alerts.rules.summary.above', { level })
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

export function AlertRuleList({
  rules,
  trades,
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
    <ul className="min-h-0 divide-y divide-outline-variant/40 overflow-y-auto">
      {rules.map((rule) => (
        <li key={rule.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span className="truncate">{rule.symbol}</span>
              {rule.enabled ? null : (
                <span className="rounded-app-full bg-surface-container-highest px-1.5 py-0.5 text-2xs font-medium text-on-surface-variant">
                  {t('alerts.rules.paused')}
                </span>
              )}
            </p>
            <p className="truncate text-xs text-on-surface-variant">{ruleSummary(rule, t)}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-2xs text-on-surface-variant">
              <span>{t('alerts.rules.repeat', { mode: repeatLabel(rule, t) })}</span>
              <span aria-hidden="true">·</span>
              <span>{lastFiredLabel(rule, t)}</span>
              {rule.referencePrice === null ? null : (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t('alerts.rules.reference', { price: formatPrice(rule.referencePrice) })}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
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
        </li>
      ))}

      {tradeRows.map((trade) => (
        <li key={trade.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span className="truncate">{trade.symbol}</span>
              <span className="rounded-app-full bg-surface-container-highest px-1.5 py-0.5 text-2xs font-medium text-on-surface-variant">
                {t('alerts.rules.tradeBadge')}
              </span>
            </p>
            <p className="truncate text-xs text-on-surface-variant">{tradeSummary(trade, t)}</p>
            {tradePriceUnavailable(trade) ? (
              <p className="text-2xs text-on-surface-variant">
                {t('alerts.rules.priceUnavailable')}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              label={t('alerts.rules.tradeEditAria', { symbol: trade.symbol })}
              size="sm"
              onClick={() => onEditTrade(trade)}
            >
              <Pencil />
            </IconButton>
          </div>
        </li>
      ))}
    </ul>
  )
}
