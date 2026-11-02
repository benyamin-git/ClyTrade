import { useId, useState } from 'react'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import type { Translator } from '@/i18n/translate'
import { cn } from '@/lib/cn'
import { isBackgroundPlatform, setNativeBackgroundMonitoring } from '@/lib/native'
import { APP_PLATFORM } from '@/lib/version'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import {
  useNotificationPermission,
  type NotificationPermissionState,
} from '../logic/useNotificationPermission'

function permissionStatus(permission: NotificationPermissionState, t: Translator): string {
  if (permission === 'granted') return t('notifications.permission.granted')
  if (permission === 'denied') return t('notifications.permission.denied')
  if (permission === 'unsupported') return t('notifications.permission.unsupported')
  return t('notifications.permission.default')
}

function cadenceLabel(t: Translator): string {
  if (APP_PLATFORM === 'windows') return t('alerts.background.cadenceWindows')
  return t('alerts.background.cadenceAndroid')
}

export function BackgroundMonitoringCard() {
  const { preferences, updatePreferences } = usePreferences()
  const { t } = useI18n()
  const { permission, request } = useNotificationPermission()
  const [busy, setBusy] = useState(false)
  const [permissionFailed, setPermissionFailed] = useState(false)
  const descriptionId = useId()
  const available = isBackgroundPlatform()
  const enabled = available && preferences.backgroundMonitoring
  const title = t('alerts.background.title')

  async function enable() {
    setBusy(true)
    setPermissionFailed(false)
    try {
      const granted = await request()
      if (!granted) {
        setPermissionFailed(true)
        return
      }
      updatePreferences({ backgroundMonitoring: true })
      setNativeBackgroundMonitoring(true)
    } finally {
      setBusy(false)
    }
  }

  function disable() {
    updatePreferences({ backgroundMonitoring: false })
    setNativeBackgroundMonitoring(false)
    setPermissionFailed(false)
  }

  function handleToggle() {
    if (enabled) {
      disable()
      return
    }
    void enable()
  }

  return (
    <Card title={title} aria-label={title} data-testid="alerts-background" className="shrink-0">
      <div className="flex flex-col gap-2 px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={t('alerts.background.toggle')}
            aria-describedby={descriptionId}
            disabled={!available || busy}
            onClick={handleToggle}
            className="inline-flex h-control w-14 shrink-0 items-center justify-center rounded-app-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              aria-hidden="true"
              className={cn(
                'relative h-6 w-11 rounded-full border transition-colors',
                enabled
                  ? 'border-primary bg-primary'
                  : 'border-outline bg-surface-container-highest',
              )}
            >
              <span
                className={cn(
                  'absolute start-1 top-1/2 size-4 -translate-y-1/2 rounded-full transition-transform',
                  enabled ? 'translate-x-5 bg-on-primary rtl:-translate-x-5' : 'bg-outline',
                )}
              />
            </span>
          </button>
          <span className="text-sm font-medium text-on-surface">
            {t('alerts.background.toggle')}
          </span>
          <span className="rounded-app-full bg-surface-container-highest px-2 py-0.5 text-2xs font-medium text-on-surface-variant">
            {enabled ? t('alerts.background.on') : t('alerts.background.off')}
          </span>
          <span role="status" className="ms-auto text-xs text-on-surface-variant">
            {t('notifications.permission.label')}: {permissionStatus(permission, t)}
          </span>
          {permission === 'default' ? (
            <Button size="sm" variant="outlined" disabled={busy} onClick={() => void request()}>
              {t('notifications.permission.request')}
            </Button>
          ) : null}
        </div>
        <p id={descriptionId} className="text-xs text-on-surface-variant">
          {available ? cadenceLabel(t) : t('alerts.background.unavailable')}
        </p>
        {permissionFailed ? (
          <p role="alert" className="text-xs text-error">
            {t('alerts.background.permissionRequired')}
          </p>
        ) : null}
      </div>
    </Card>
  )
}
