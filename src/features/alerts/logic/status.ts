import type { TranslationKey } from '@/i18n/types'
import type { Translator } from '@/i18n/translate'
import type { SchedulerStatus } from '@/market/scheduler'

export function providerLabel(provider: SchedulerStatus['provider'], t: Translator): string {
  if (provider === 'binance') return t('preferences.providerBinance')
  if (provider === 'coingecko') return t('preferences.providerCoingecko')
  return t('preferences.providerAuto')
}

export function errorKey(error: string): TranslationKey {
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
