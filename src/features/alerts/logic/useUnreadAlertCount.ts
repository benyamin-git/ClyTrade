import { useLiveQuery } from 'dexie-react-hooks'
import { listAlertEvents } from '@/data/repositories/alerts.repo'

export function useUnreadAlertCount(): number {
  const events = useLiveQuery(() => listAlertEvents(), [], undefined)
  return events?.filter((event) => event.status === 'unread').length ?? 0
}
