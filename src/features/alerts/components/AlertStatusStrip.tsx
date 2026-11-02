import { useI18n } from '@/i18n/I18nContext'
import type { TranslationKey } from '@/i18n/types'
import type { Translator } from '@/i18n/translate'
import { formatTime } from '@/lib/dates'
import { formatNumber } from '@/lib/format'
import type { SchedulerStatus } from '@/market/scheduler'
import { Stat } from '@/ui/components/Stat'
import { useCooldownActive } from '../logic/useCooldownActive'

export interface AlertStatusStripProps {
  status: SchedulerStatus
}

function providerLabel(provider: SchedulerStatus['provider'], t: Translator): string {
  if (provider === 'binance') return t('preferences.providerBinance')
  if (provider === 'coingecko') return t('preferences.providerCoingecko')
  return t('preferences.providerAuto')
}

function errorKey(error: string): TranslationKey {
  switch (error) {
    case 'rate-limit':
      return 'alerts.status.errors.rateLimit'
    case 'blocked':
      return 'alerts.status.errors.blocked'
    case 'network':
      return 'alerts.status.errors.network'
    case 'invalid':
      return 'alerts.status.errors.invalid'
    case 'budget':
      return 'alerts.status.errors.budget'
    case 'manual-cooldown':
      return 'alerts.status.errors.manualCooldown'
    default:
      return 'alerts.status.errors.unknown'
  }
}

export function AlertStatusStrip({ status }: AlertStatusStripProps) {
  const { t } = useI18n()
  const coolingDown = useCooldownActive(status.nextAllowedAt)
  const activeProvider =
    status.activeProvider === null ? '—' : providerLabel(status.activeProvider, t)

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label={t('alerts.status.provider')} value={providerLabel(status.provider, t)} />
        <Stat label={t('alerts.status.active')} value={activeProvider} />
        <Stat
          label={t('alerts.status.lastSuccess')}
          value={
            status.lastSuccessAt === null
              ? t('alerts.status.never')
              : formatTime(status.lastSuccessAt)
          }
        />
        <Stat
          label={t('alerts.status.nextRefresh')}
          value={
            coolingDown && status.nextAllowedAt !== null
              ? formatTime(status.nextAllowedAt)
              : t('alerts.status.now')
          }
        />
        {status.monthlyUsage ? (
          <Stat
            label={t('alerts.status.monthlyUsage')}
            value={t('alerts.status.monthlyUsageValue', {
              used: formatNumber(status.monthlyUsage.used),
              limit: formatNumber(status.monthlyUsage.limit),
            })}
          />
        ) : null}
      </div>
      {status.error ? (
        <p role="status" className="text-xs text-error">
          {t(errorKey(status.error))}
        </p>
      ) : null}
    </div>
  )
}
