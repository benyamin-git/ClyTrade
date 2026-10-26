import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import {
  DEFAULT_PREFERENCES,
  MARKET_USAGE_KEY,
  PREFERENCES_KEY,
  monthKey,
  type Preferences,
} from '../models/settings'
import {
  clearSettings,
  getMarketUsage,
  getPreferences,
  recordMarketUsage,
  setPreferences,
  updatePreferences,
} from './settings.repo'

async function rawPreferences(): Promise<Record<string, unknown>> {
  const row = await db.settings.get(PREFERENCES_KEY)
  return (row?.value ?? {}) as Record<string, unknown>
}

describe('market usage', () => {
  const NOW = Date.UTC(2026, 9, 25, 12)

  beforeEach(async () => {
    await clearSettings()
  })

  afterEach(async () => {
    await clearSettings()
  })

  it('starts a new counter at zero', async () => {
    expect(await getMarketUsage(NOW)).toEqual({ month: monthKey(NOW), coingeckoRequests: 0 })
  })

  it('persists requests for the current month', async () => {
    await recordMarketUsage(3, NOW)
    await recordMarketUsage(2, NOW)

    expect(await getMarketUsage(NOW)).toEqual({
      month: monthKey(NOW),
      coingeckoRequests: 5,
    })
    expect(await db.settings.get(MARKET_USAGE_KEY)).toMatchObject({
      value: { month: monthKey(NOW), coingeckoRequests: 5 },
    })
  })

  it('resets the counter when the month changes', async () => {
    await recordMarketUsage(7, NOW)

    expect(await getMarketUsage(Date.UTC(2026, 10, 1, 0))).toEqual({
      month: '2026-11',
      coingeckoRequests: 0,
    })
  })
})

describe('updatePreferences', () => {
  beforeEach(async () => {
    await clearSettings()
  })

  afterEach(async () => {
    await clearSettings()
  })

  it('keeps the valid fields of a corrupt stored row when patching', async () => {
    await db.settings.put({
      key: PREFERENCES_KEY,
      value: { ...DEFAULT_PREFERENCES, currency: 'EUR', accountSize: 5000, leverage: 0 },
      updatedAt: 1,
    })

    await updatePreferences({ riskPercent: 2 })

    expect(await getPreferences()).toEqual({
      ...DEFAULT_PREFERENCES,
      currency: 'EUR',
      accountSize: 5000,
      riskPercent: 2,
    })
  })

  it('rejects an invalid patch and leaves the stored row unchanged', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, currency: 'EUR' })

    await expect(updatePreferences({ riskPercent: 200 })).rejects.toThrow()

    const stored = await rawPreferences()
    expect(stored.currency).toBe('EUR')
    expect(stored.riskPercent).toBe(DEFAULT_PREFERENCES.riskPercent)
  })

  it('rejects an undefined field without wiping the stored value', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, currency: 'EUR' })

    await expect(
      updatePreferences({ currency: undefined } as unknown as Partial<Preferences>),
    ).rejects.toThrow()

    const stored = await rawPreferences()
    expect(stored.currency).toBe('EUR')
  })
})
