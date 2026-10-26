import { CircleAlert } from 'lucide-react'
import type { AlertEvent } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { useI18n } from '@/i18n/I18nContext'
import type { Translator } from '@/i18n/translate'
import { formatDate, formatTime } from '@/lib/dates'
import { formatPrice } from '@/lib/format'
import { Button } from '@/ui/components/Button'
import { EmptyState } from '@/ui/components/EmptyState'

export interface AlertReviewListProps {
  events: readonly AlertEvent[]
  trades: readonly Trade[]
  refreshDisabled: boolean
  onCloseAt: (event: AlertEvent, level: 'target' | 'stop') => void
  onEdit: (event: AlertEvent) => void
  onDismiss: (event: AlertEvent) => void
  onRefresh: (event: AlertEvent) => void
}

function gapActionable(event: AlertEvent, trades: readonly Trade[]): boolean {
  if (event.tradeId === null) return false
  const trade = trades.find((entry) => entry.id === event.tradeId)
  if (!trade || trade.status !== 'open') return false
  return trade.targetPrice === event.targetPrice && trade.stopPrice === event.stopPrice
}

function description(event: AlertEvent, t: Translator): string {
  if (event.kind === 'stale') {
    return t('alerts.review.staleDescription', { symbol: event.symbol })
  }
  if (event.kind === 'conflict') return t('alerts.review.conflictDescription')
  return t('alerts.review.gapDescription')
}

export function AlertReviewList({
  events,
  trades,
  refreshDisabled,
  onCloseAt,
  onEdit,
  onDismiss,
  onRefresh,
}: AlertReviewListProps) {
  const { t } = useI18n()

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CircleAlert />}
        title={t('alerts.review.emptyTitle')}
        description={t('alerts.review.emptyDescription')}
      />
    )
  }

  return (
    <ul className="min-h-0 divide-y divide-outline-variant/40 overflow-y-auto">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>{event.symbol}</span>
              <span className="rounded-app-full bg-secondary-container px-1.5 py-0.5 text-2xs font-medium text-on-secondary-container">
                {t(`alerts.kinds.${event.kind}`)}
              </span>
            </p>
            <time
              dateTime={new Date(event.at).toISOString()}
              className="text-2xs text-on-surface-variant"
            >
              {t('alerts.at', { date: formatDate(event.at), time: formatTime(event.at) })}
            </time>
          </div>

          <p className="text-xs text-on-surface-variant">{description(event, t)}</p>

          {event.kind === 'gap' && !gapActionable(event, trades) ? (
            <p role="status" className="text-xs text-error">
              {t('alerts.review.tradeChanged')}
            </p>
          ) : null}

          <p className="flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
            <span>{t('alerts.price', { price: formatPrice(event.price) })}</span>
            {event.kind === 'gap' ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {t('alerts.review.levels', {
                    target: event.targetPrice === null ? '—' : formatPrice(event.targetPrice),
                    stop: event.stopPrice === null ? '—' : formatPrice(event.stopPrice),
                  })}
                </span>
              </>
            ) : null}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {event.kind === 'gap' && event.targetPrice !== null ? (
              <Button
                size="sm"
                variant="tonal"
                onClick={() => onCloseAt(event, 'target')}
                disabled={!gapActionable(event, trades)}
              >
                {t('alerts.review.closeAtTarget', { level: formatPrice(event.targetPrice) })}
              </Button>
            ) : null}
            {event.kind === 'gap' && event.stopPrice !== null ? (
              <Button
                size="sm"
                variant="tonal"
                onClick={() => onCloseAt(event, 'stop')}
                disabled={!gapActionable(event, trades)}
              >
                {t('alerts.review.closeAtStop', { level: formatPrice(event.stopPrice) })}
              </Button>
            ) : null}
            {event.kind === 'stale' ? (
              <Button
                size="sm"
                variant="outlined"
                onClick={() => onRefresh(event)}
                disabled={refreshDisabled}
              >
                {t('alerts.review.refresh')}
              </Button>
            ) : null}
            {event.tradeId !== null || event.ruleId !== null ? (
              <Button size="sm" variant="text" onClick={() => onEdit(event)}>
                {event.tradeId !== null
                  ? t('alerts.review.editTrade')
                  : t('alerts.review.editRule')}
              </Button>
            ) : null}
            <Button size="sm" variant="text" onClick={() => onDismiss(event)}>
              {t('alerts.review.dismiss')}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
