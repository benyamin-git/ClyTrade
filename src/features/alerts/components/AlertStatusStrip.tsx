import { useI18n } from '@/i18n/I18nContext'
import { formatTime } from '@/lib/dates'
import { formatNumber } from '@/lib/format'
import type { SchedulerStatus } from '@/market/scheduler'
import { Stat } from '@/ui/components/Stat'
import { errorKey, providerLabel } from '../logic/status'
import { useCooldownActive } from '../logic/useCooldownActive'

export interface AlertStatusStripProps {
  status: SchedulerStatus
}

export function AlertStatusStrip({ status }: AlertStatusStripProps) {
  const { t } = useI18n()
  const coolingDown = useCooldownActive(status.nextAllowedAt)
  const activeProvider =
    status.activeProvider === null ? '—' : providerLabel(status.activeProvider, t)

  return (
    <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-6">
      <Stat
        size="sm"
        label={t('alerts.status.provider')}
        value={providerLabel(status.provider, t)}
      />
      <Stat size="sm" label={t('alerts.status.active')} value={activeProvider} />
      <Stat
        size="sm"
        label={t('alerts.status.lastSuccess')}
        value={
          status.lastSuccessAt === null
            ? t('alerts.status.never')
            : formatTime(status.lastSuccessAt)
        }
      />
      <Stat
        size="sm"
        label={t('alerts.status.nextRefresh')}
        value={
          coolingDown && status.nextAllowedAt !== null
            ? formatTime(status.nextAllowedAt)
            : t('alerts.status.now')
        }
      />
      {status.monthlyUsage ? (
        <Stat
          size="sm"
          label={t('alerts.status.monthlyUsage')}
          value={t('alerts.status.monthlyUsageValue', {
            used: formatNumber(status.monthlyUsage.used),
            limit: formatNumber(status.monthlyUsage.limit),
          })}
        />
      ) : null}
      {status.error ? (
        <p role="status" className="w-full text-xs text-error">
          {t(errorKey(status.error))}
        </p>
      ) : null}
    </div>
  )
}
