import type { AlertEvent, AlertEventKind } from '@/data/models/price'

export type AlertHistoryFilter = 'all' | 'unread' | AlertEventKind

export function filterAlertEvents(
  events: readonly AlertEvent[],
  filter: AlertHistoryFilter,
): AlertEvent[] {
  if (filter === 'all') return [...events]
  if (filter === 'unread') return events.filter((event) => event.status === 'unread')
  return events.filter((event) => event.kind === filter)
}
