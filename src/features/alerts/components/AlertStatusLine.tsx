import { ChevronRight, RefreshCw } from 'lucide-react'
import { useI18n } from '@/i18n/I18nContext'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/dates'
import type { SchedulerStatus } from '@/market/scheduler'
import { STALE_MS } from '@/market/types'
import { Button } from '@/ui/components/Button'
import { errorKey, providerLabel } from '../logic/status'
import { useCooldownActive } from '../logic/useCooldownActive'

export interface AlertStatusLineProps {
  status: SchedulerStatus
  onOpen: () => void
  onRefresh: () => void
  refreshDisabled: boolean
  refreshing: boolean
}

type Health = 'live' | 'stale' | 'waiting' | 'error'

function healthOf(status: SchedulerStatus): Health {
  if (status.error) return 'error'
  if (status.lastSuccessAt === null) return 'waiting'
  return Date.now() - status.lastSuccessAt > STALE_MS ? 'stale' : 'live'
}

const dotClasses: Record<Health, string> = {
  live: 'bg-profit',
  stale: 'bg-warning',
  waiting: 'bg-outline',
  error: 'bg-error',
}

const labelClasses: Record<Health, string> = {
  live: 'text-on-surface',
  stale: 'text-warning',
  waiting: 'text-on-surface-variant',
  error: 'text-error',
}

export function AlertStatusLine({
  status,
  onOpen,
  onRefresh,
  refreshDisabled,
  refreshing,
}: AlertStatusLineProps) {
  const { t } = useI18n()
  const coolingDown = useCooldownActive(status.nextAllowedAt)
  const health = healthOf(status)
  const label =
    health === 'error' && status.error
      ? t(errorKey(status.error))
      : health === 'live'
        ? t('alerts.status.live')
        : health === 'stale'
          ? t('alerts.status.stale')
          : t('alerts.status.waiting')
  const provider = providerLabel(status.provider, t)
  const activeProvider =
    status.activeProvider === null ? null : providerLabel(status.activeProvider, t)
  const showActive = activeProvider !== null && activeProvider !== provider

  return (
    <section
      aria-label={t('alerts.sections.status')}
      data-testid="alerts-status"
      className="flex items-center gap-2 rounded-app-md border border-outline-variant/60 bg-surface-container-low px-2 py-2 sm:px-3"
    >
      <button
        type="button"
        data-testid="alerts-status-details"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="state-layer flex min-w-0 flex-1 items-center gap-3 rounded-app-sm px-2 py-1 text-start"
      >
        <span
          aria-hidden="true"
          className={cn('size-2 shrink-0 rounded-app-full', dotClasses[health])}
        />
        <span className="min-w-0">
          <span
            role={health === 'error' ? 'status' : undefined}
            className={cn('block truncate text-sm font-medium', labelClasses[health])}
          >
            {label}
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-on-surface-variant">
            <span>{provider}</span>
            {showActive ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{activeProvider}</span>
              </>
            ) : null}
            {coolingDown && status.nextAllowedAt !== null ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{t('alerts.status.nextRefresh')}</span>
                <span>{formatTime(status.nextAllowedAt)}</span>
              </>
            ) : status.lastSuccessAt !== null ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatTime(status.lastSuccessAt)}</span>
              </>
            ) : null}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-on-surface-variant rtl:rotate-180"
        />
      </button>
      <Button
        size="sm"
        variant="outlined"
        icon={<RefreshCw />}
        onClick={onRefresh}
        disabled={refreshDisabled}
        aria-label={refreshing ? t('alerts.status.refreshing') : t('alerts.status.refresh')}
        className="shrink-0"
      >
        <span className="hidden sm:inline">
          {refreshing ? t('alerts.status.refreshing') : t('alerts.status.refresh')}
        </span>
      </Button>
    </section>
  )
}
