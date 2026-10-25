import { History } from 'lucide-react'
import { alertEventKindSchema, type AlertEvent } from '@/data/models/price'
import { useI18n } from '@/i18n/I18nContext'
import { formatDate, formatTime } from '@/lib/dates'
import { formatPrice } from '@/lib/format'
import { Button } from '@/ui/components/Button'
import { EmptyState } from '@/ui/components/EmptyState'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { SelectField } from '@/ui/components/SelectField'
import { filterAlertEvents, type AlertHistoryFilter } from '../logic/alertHistory'

export interface AlertHistoryProps {
  events: readonly AlertEvent[]
  filter: AlertHistoryFilter
  onMarkAllRead: () => void
  onFilter: (filter: AlertHistoryFilter) => void
}

export function AlertHistory({ events, filter, onMarkAllRead, onFilter }: AlertHistoryProps) {
  const { t } = useI18n()
  const filtered = filterAlertEvents(events, filter)
  const unreadCount = events.filter((event) => event.status === 'unread').length
  const kindFilter = filter === 'all' || filter === 'unread' ? 'all' : filter

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3">
        <SegmentedControl
          value={filter as 'all' | 'unread'}
          options={[
            { value: 'all', label: t('alerts.history.all') },
            { value: 'unread', label: t('alerts.history.unread') },
          ]}
          onChange={onFilter}
          size="sm"
          ariaLabel={t('alerts.history.filterLabel')}
        />
        <SelectField
          label={t('alerts.history.typeLabel')}
          value={kindFilter}
          options={[
            { value: 'all', label: t('alerts.history.allTypes') },
            ...alertEventKindSchema.options.map((kind) => ({
              value: kind,
              label: t(`alerts.kinds.${kind}`),
            })),
          ]}
          onChange={(value) => onFilter(value as AlertHistoryFilter)}
          className="w-44"
        />
        <div className="flex-1" />
        <Button size="sm" variant="outlined" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          {t('alerts.history.markAllRead')}
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<History />}
          title={t('alerts.history.emptyTitle')}
          description={t('alerts.history.emptyDescription')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('alerts.history.noMatchTitle')}
          description={t('alerts.history.noMatchDescription')}
        />
      ) : (
        <ul className="min-h-0 divide-y divide-outline-variant/40 overflow-y-auto">
          {filtered.map((event) => {
            const unread = event.status === 'unread'
            return (
              <li key={event.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
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
                <time
                  dateTime={new Date(event.at).toISOString()}
                  className="shrink-0 text-2xs text-on-surface-variant"
                >
                  {t('alerts.at', { date: formatDate(event.at), time: formatTime(event.at) })}
                </time>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
