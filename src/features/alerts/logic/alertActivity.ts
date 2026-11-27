import type { AlertEvent, AlertEventKind } from '@/data/models/price'

export const REVIEW_KINDS: readonly AlertEventKind[] = ['gap', 'stale', 'conflict']

export function isReviewEvent(event: AlertEvent): boolean {
  return (event.status === 'unread' || event.status === 'read') && REVIEW_KINDS.includes(event.kind)
}

export type ActivityScope = 'review' | 'unread' | 'all'

export type ActivityKind = 'all' | AlertEventKind

export function filterActivityEvents(
  events: readonly AlertEvent[],
  scope: ActivityScope,
  kind: ActivityKind,
): AlertEvent[] {
  const scoped =
    scope === 'review'
      ? events.filter(isReviewEvent)
      : scope === 'unread'
        ? events.filter((event) => event.status === 'unread')
        : [...events]
  return kind === 'all' ? scoped : scoped.filter((event) => event.kind === kind)
}
