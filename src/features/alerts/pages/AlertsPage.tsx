import { Bell, CircleAlert, History } from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { Card } from '@/ui/components/Card'
import { EmptyState } from '@/ui/components/EmptyState'
import { ViewportPage } from '@/ui/layout/ViewportPage'

export function AlertsPage() {
  const { t } = useI18n()
  const statusLabel = t('alerts.sections.status')
  const rulesLabel = t('alerts.sections.rules')
  const reviewLabel = t('alerts.sections.review')
  const historyLabel = t('alerts.sections.history')

  return (
    <ViewportPage className="gap-3 overflow-y-auto">
      <Card
        className="shrink-0"
        title={statusLabel}
        aria-label={statusLabel}
        data-testid="alerts-status"
      >
        <p className="px-4 py-3 text-sm text-on-surface-variant">
          {t('alerts.status.placeholder')}
        </p>
      </Card>

      <Card
        className="shrink-0"
        title={rulesLabel}
        aria-label={rulesLabel}
        data-testid="alerts-rules"
      >
        <EmptyState
          icon={<Bell />}
          title={t('alerts.rules.emptyTitle')}
          description={t('alerts.rules.emptyDescription')}
        />
      </Card>

      <Card
        className="shrink-0"
        title={reviewLabel}
        aria-label={reviewLabel}
        data-testid="alerts-review"
      >
        <EmptyState
          icon={<CircleAlert />}
          title={t('alerts.review.emptyTitle')}
          description={t('alerts.review.emptyDescription')}
        />
      </Card>

      <Card
        className="shrink-0"
        title={historyLabel}
        aria-label={historyLabel}
        data-testid="alerts-history"
      >
        <EmptyState
          icon={<History />}
          title={t('alerts.history.emptyTitle')}
          description={t('alerts.history.emptyDescription')}
        />
      </Card>
    </ViewportPage>
  )
}
