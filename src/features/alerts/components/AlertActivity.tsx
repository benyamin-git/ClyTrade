import { useState } from 'react'
import { CircleAlert, History } from 'lucide-react'
import { alertEventKindSchema, type AlertEvent } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import { useI18n } from '@/i18n/I18nContext'
import { EmptyState } from '@/ui/components/EmptyState'
import { SegmentedControl, type SegmentedControlOption } from '@/ui/components/SegmentedControl'
import { SelectField, type SelectOption } from '@/ui/components/SelectField'
import {
  filterActivityEvents,
  isReviewEvent,
  type ActivityKind,
  type ActivityScope,
} from '../logic/alertActivity'
import { AlertHistoryRow } from './AlertHistoryRow'
import { AlertReviewItem } from './AlertReviewItem'

export interface AlertActivityProps {
  events: readonly AlertEvent[]
  trades: readonly Trade[]
  refreshDisabled: boolean
  onCloseAt: (event: AlertEvent, level: 'target' | 'stop') => void
  onEdit: (event: AlertEvent) => void
  onDismiss: (event: AlertEvent) => void
  onRefresh: (event: AlertEvent) => void
  onDelete: (event: AlertEvent) => void
}

export function AlertActivity({
  events,
  trades,
  refreshDisabled,
  onCloseAt,
  onEdit,
  onDismiss,
  onRefresh,
  onDelete,
}: AlertActivityProps) {
  const { t } = useI18n()
  const [scope, setScope] = useState<ActivityScope>('all')
  const [kind, setKind] = useState<ActivityKind>('all')
  const filtered = filterActivityEvents(events, scope, kind)
  const scopeOptions: SegmentedControlOption<ActivityScope>[] = [
    { value: 'review', label: t('alerts.sections.review') },
    { value: 'unread', label: t('alerts.history.unread') },
    { value: 'all', label: t('alerts.history.all') },
  ]
  const kindOptions: SelectOption<ActivityKind>[] = [
    { value: 'all', label: t('alerts.history.allTypes') },
    ...alertEventKindSchema.options.map((option) => ({
      value: option,
      label: t(`alerts.kinds.${option}`),
    })),
  ]

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-end gap-2">
        <div className="w-full sm:w-64">
          <SegmentedControl
            value={scope}
            options={scopeOptions}
            onChange={setScope}
            size="sm"
            fullWidth
            ariaLabel={t('alerts.activity.filterLabel')}
          />
        </div>
        <SelectField
          label={t('alerts.history.typeLabel')}
          value={kind}
          options={kindOptions}
          onChange={setKind}
          className="min-w-0 max-w-44 flex-1"
        />
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<History />}
          title={t('alerts.history.emptyTitle')}
          description={t('alerts.history.emptyDescription')}
        />
      ) : filtered.length === 0 ? (
        scope === 'review' && kind === 'all' ? (
          <EmptyState
            icon={<CircleAlert />}
            title={t('alerts.review.emptyTitle')}
            description={t('alerts.review.emptyDescription')}
          />
        ) : (
          <EmptyState
            title={t('alerts.history.noMatchTitle')}
            description={t('alerts.history.noMatchDescription')}
          />
        )
      ) : (
        <ul className="flex min-h-0 flex-col gap-3">
          {filtered.map((event) => (
            <li key={event.id}>
              {isReviewEvent(event) ? (
                <AlertReviewItem
                  event={event}
                  trades={trades}
                  refreshDisabled={refreshDisabled}
                  onCloseAt={onCloseAt}
                  onEdit={onEdit}
                  onDismiss={onDismiss}
                  onRefresh={onRefresh}
                  onDelete={onDelete}
                />
              ) : (
                <AlertHistoryRow event={event} onDelete={onDelete} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
