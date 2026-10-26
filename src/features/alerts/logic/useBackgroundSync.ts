import { useCallback, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAlerts } from '@/data/repositories/alerts.repo'
import { getMarketApiKey } from '@/data/repositories/settings.repo'
import { listTrades } from '@/data/repositories/trades.repo'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { isBackgroundPlatform, setNativeBackgroundMonitoring } from '@/lib/native'
import {
  buildBackgroundSnapshot,
  clearBackgroundEvents,
  readBackgroundEvents,
  writeBackgroundSnapshot,
} from '@/market/background'
import { importBackgroundEvents } from '@/market/backgroundImport'
import { buildAutoCloseNote, type AutoCloseNoteInput } from './autoCloseNote'

const SNAPSHOT_DEBOUNCE_MS = 500

let nativeImportInFlight: Promise<void> | null = null

export function waitForNativeImport(): Promise<void> {
  return nativeImportInFlight ?? Promise.resolve()
}

export function useBackgroundSync(): void {
  const { preferences, ready } = usePreferences()
  const { locale, t } = useI18n()
  const stored = useLiveQuery(
    async () => ({
      trades: await listTrades(),
      rules: await listAlerts(),
      apiKey: await getMarketApiKey(),
    }),
    [],
  )
  const native = isBackgroundPlatform()
  const tRef = useRef(t)

  useEffect(() => {
    tRef.current = t
  }, [t])

  const note = useCallback(
    (input: AutoCloseNoteInput) => buildAutoCloseNote(tRef.current, input),
    [],
  )

  const importQueue = useCallback(async () => {
    if (!native) return
    if (nativeImportInFlight) {
      await nativeImportInFlight
      return
    }

    const run = (async () => {
      try {
        const events = await readBackgroundEvents()
        if (events.length > 0) {
          await importBackgroundEvents(events, Date.now(), note)
        }
        await clearBackgroundEvents()
      } catch {
        return
      }
    })()
    nativeImportInFlight = run

    try {
      await run
    } finally {
      if (nativeImportInFlight === run) nativeImportInFlight = null
    }
  }, [native, note])

  useEffect(() => {
    if (!native) return

    void importQueue()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void importQueue()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [native, importQueue])

  useEffect(() => {
    if (!native || !ready) return
    setNativeBackgroundMonitoring(preferences.backgroundMonitoring)
  }, [native, ready, preferences.backgroundMonitoring])

  useEffect(() => {
    if (!native || stored === undefined) return

    const timer = window.setTimeout(() => {
      const snapshot = buildBackgroundSnapshot({
        now: Date.now(),
        locale,
        preferences,
        coingeckoKey: stored.apiKey,
        notification: {
          title: t('notifications.title'),
          body: t('notifications.backgroundBody'),
        },
        trades: stored.trades,
        rules: stored.rules,
      })
      void writeBackgroundSnapshot(snapshot).catch(() => undefined)
    }, SNAPSHOT_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [native, stored, preferences, locale, t])
}
