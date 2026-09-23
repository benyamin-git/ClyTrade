import { db } from '../db'
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  parsePreferences,
  type Preferences,
  type SettingRow,
} from '../models/settings'

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const row: SettingRow = { key, value, updatedAt: Date.now() }
  await db.settings.put(row)
}

export async function getPreferences(): Promise<Preferences> {
  const value = await getSetting<unknown>(PREFERENCES_KEY)
  return parsePreferences(value ?? DEFAULT_PREFERENCES)
}

export async function setPreferences(preferences: Preferences): Promise<void> {
  await setSetting(PREFERENCES_KEY, preferences)
}

export async function listSettings(): Promise<SettingRow[]> {
  return db.settings.toArray()
}

export async function replaceAllSettings(rows: SettingRow[]): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    await db.settings.clear()
    await db.settings.bulkAdd(rows)
  })
}

export async function mergeSettings(rows: SettingRow[]): Promise<void> {
  await db.settings.bulkPut(rows)
}

export async function clearSettings(): Promise<void> {
  await db.settings.clear()
}
