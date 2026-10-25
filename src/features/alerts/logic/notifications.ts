import type { AlertEvent } from '@/data/models/price'
import type { Translator } from '@/i18n/translate'
import { formatPrice } from '@/lib/format'
import { APP_PLATFORM } from '@/lib/version'

export interface NotificationPayload {
  title: string
  body: string
  tag: string
}

const GROUP_TAG = 'clytrade-alerts'
const MAX_ITEMS = 5

export function buildGroupedNotification(
  events: readonly AlertEvent[],
  t: Translator,
): NotificationPayload | null {
  if (events.length === 0) return null

  const items = events.slice(0, MAX_ITEMS).map((event) =>
    t('notifications.item', {
      symbol: event.symbol,
      kind: t(`alerts.kinds.${event.kind}`),
      level: formatPrice(event.level ?? event.price),
    }),
  )

  const remaining = events.length - MAX_ITEMS
  if (remaining > 0) items.push(t('notifications.more', { count: remaining }))

  return { title: t('notifications.title'), body: items.join('\n'), tag: GROUP_TAG }
}

function openAlerts(): void {
  window.focus()
  window.location.hash = '#/alerts/overview'
}

function showWebNotification(payload: NotificationPayload): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  const notification = new Notification(payload.title, {
    body: payload.body,
    tag: payload.tag,
  })
  notification.onclick = openAlerts
}

async function showNativeNotification(payload: NotificationPayload): Promise<void> {
  const { isPermissionGranted, sendNotification } = await import('@tauri-apps/plugin-notification')
  if (!(await isPermissionGranted())) return
  sendNotification({ title: payload.title, body: payload.body })
}

export async function showNotification(payload: NotificationPayload): Promise<void> {
  try {
    if (APP_PLATFORM === 'web') {
      showWebNotification(payload)
      return
    }
    await showNativeNotification(payload)
  } catch {
    return
  }
}
