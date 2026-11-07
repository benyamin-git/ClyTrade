import Dexie from 'dexie'
import { newId } from '@/lib/id'
import { db } from '../db'
import {
  alertEventSchema,
  priceAlertSchema,
  type AlertEvent,
  type AlertEventDraft,
  type AlertResolution,
  type PriceAlert,
  type PriceAlertDraft,
} from '../models/price'

export async function listAlerts(): Promise<PriceAlert[]> {
  return db.priceAlerts.orderBy('updatedAt').reverse().toArray()
}

export async function getAlert(id: string): Promise<PriceAlert | undefined> {
  return db.priceAlerts.get(id)
}

export async function createAlert(draft: PriceAlertDraft): Promise<PriceAlert> {
  const now = Date.now()
  const alert = priceAlertSchema.parse({
    ...draft,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  })
  await db.priceAlerts.add(alert)
  return alert
}

export async function updateAlert(id: string, patch: Partial<PriceAlertDraft>): Promise<void> {
  if (Object.values(patch).some((value) => value === undefined)) {
    throw new Error('alert patch contains undefined')
  }
  const existing = await db.priceAlerts.get(id)
  if (!existing) {
    throw new Error('alert not found')
  }
  const parsed = priceAlertSchema.parse({ ...existing, ...patch, updatedAt: Date.now() })
  await db.priceAlerts.put(parsed)
}

export async function deleteAlert(id: string): Promise<void> {
  await db.priceAlerts.delete(id)
}

export async function listAlertEvents(limit = 500): Promise<AlertEvent[]> {
  const safeLimit = Math.max(0, Math.floor(limit))
  return db.alertEvents.orderBy('at').reverse().limit(safeLimit).toArray()
}

export async function getAlertEvent(id: string): Promise<AlertEvent | undefined> {
  return db.alertEvents.get(id)
}

export async function importAlertEvent(event: AlertEvent): Promise<boolean> {
  const existing = await db.alertEvents.get(event.id)
  if (existing) return false
  const parsed = alertEventSchema.parse(event)
  try {
    await db.alertEvents.add(parsed)
    return true
  } catch (error) {
    if (error instanceof Dexie.ConstraintError) return false
    throw error
  }
}

export async function createAlertEvent(draft: AlertEventDraft): Promise<AlertEvent> {
  const event = alertEventSchema.parse({
    ...draft,
    id: newId(),
    createdAt: Date.now(),
  })
  await db.alertEvents.add(event)
  return event
}

export async function markAlertEventRead(id: string): Promise<void> {
  const existing = await db.alertEvents.get(id)
  if (!existing) return
  const now = Date.now()
  await db.alertEvents.update(id, {
    status: existing.status === 'unread' ? 'read' : existing.status,
    readAt: existing.readAt ?? now,
  })
}

export async function markAllAlertEventsRead(): Promise<void> {
  await db.alertEvents
    .where('status')
    .equals('unread')
    .modify({ status: 'read', readAt: Date.now() })
}

export async function resolveAlertEvent(id: string, resolution: AlertResolution): Promise<void> {
  const existing = await db.alertEvents.get(id)
  if (!existing) {
    throw new Error('alert event not found')
  }
  await db.alertEvents.update(id, {
    status: 'resolved',
    resolution,
    readAt: existing.readAt ?? Date.now(),
  })
}

export async function dismissAlertEvent(id: string): Promise<void> {
  const existing = await db.alertEvents.get(id)
  if (!existing) {
    throw new Error('alert event not found')
  }
  await db.alertEvents.update(id, {
    status: 'dismissed',
    resolution: 'dismiss',
    readAt: existing.readAt ?? Date.now(),
  })
}

export async function pruneAlertEvents(keep = 500): Promise<void> {
  const safeKeep = Math.max(0, Math.floor(keep))
  const count = await db.alertEvents.count()
  if (count <= safeKeep) return
  const keys = await db.alertEvents.orderBy('at').reverse().offset(safeKeep).primaryKeys()
  if (keys.length > 0) {
    await db.alertEvents.bulkDelete(keys)
  }
}

export async function replaceAllAlerts(alerts: PriceAlert[]): Promise<void> {
  await db.transaction('rw', db.priceAlerts, async () => {
    await db.priceAlerts.clear()
    if (alerts.length > 0) {
      await db.priceAlerts.bulkAdd(alerts)
    }
  })
}

export async function mergeAlerts(alerts: PriceAlert[]): Promise<void> {
  if (alerts.length > 0) {
    await db.priceAlerts.bulkPut(alerts)
  }
}

export async function replaceAllAlertEvents(events: AlertEvent[]): Promise<void> {
  await db.transaction('rw', db.alertEvents, async () => {
    await db.alertEvents.clear()
    if (events.length > 0) {
      await db.alertEvents.bulkAdd(events)
    }
  })
}

export async function mergeAlertEvents(events: AlertEvent[]): Promise<void> {
  if (events.length > 0) {
    await db.alertEvents.bulkPut(events)
  }
}

export async function deleteAlertEvent(id: string): Promise<void> {
  await db.alertEvents.delete(id)
}

export async function clearAlertEvents(): Promise<void> {
  await db.alertEvents.clear()
}
