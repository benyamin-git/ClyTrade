import { Trash2 } from 'lucide-react'
import type { AlertEvent } from '@/data/models/price'
import { useI18n } from '@/i18n/I18nContext'
import { formatDate, formatTime } from '@/lib/dates'
import { formatPrice } from '@/lib/format'
import { IconButton } from '@/ui/components/IconButton'

export interface AlertHistoryRowProps {
  event: AlertEvent
  onDelete: (event: AlertEvent) => void
}

export function AlertHistoryRow({ event, onDelete }: AlertHistoryRowProps) {
  const { t } = useI18n()
  const unread = event.status === 'unread'

  return (
    <div className="flex items-start justify-between gap-3 rounded-app-md border border-outline-variant/40 bg-surface-container-low px-4 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="truncate">{event.symbol}</span>
          <span className="rounded-app-full bg-surface-container-highest px-1.5 py-0.5 text-2xs font-medium text-on-surface-variant">
            {t(`alerts.kinds.${event.kind}`)}
          </span>
          {unread ? (
            <span className="rounded-app-full bg-primary-container px-1.5 py-0.5 text-2xs font-medium text-on-primary-container">
              {t('alerts.history.unreadBadge')}
            </span>
          ) : null}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
          <span>{t('alerts.price', { price: formatPrice(event.price) })}</span>
          {event.level === null ? null : (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('alerts.level', { level: formatPrice(event.level) })}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <time
          dateTime={new Date(event.at).toISOString()}
          className="text-2xs text-on-surface-variant"
        >
          {t('alerts.at', { date: formatDate(event.at), time: formatTime(event.at) })}
        </time>
        <IconButton
          label={t('alerts.history.deleteAria', {
            symbol: event.symbol,
            kind: t(`alerts.kinds.${event.kind}`),
          })}
          size="sm"
          onClick={() => onDelete(event)}
        >
          <Trash2 />
        </IconButton>
      </div>
    </div>
  )
}
