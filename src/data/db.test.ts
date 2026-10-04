import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db } from './db'

const DB_NAME = 'clytrade'

async function seedLegacyDatabase(preferences?: Record<string, unknown>): Promise<void> {
  const legacy = new Dexie(DB_NAME)
  legacy.version(1).stores({
    trades: 'id, symbol, direction, status, openedAt, closedAt, updatedAt',
    assets: 'id, symbol, updatedAt',
    settings: 'key, updatedAt',
  })
  await legacy.open()
  await legacy.table('trades').add({
    id: 'legacy-trade',
    symbol: 'BTCUSDT',
    direction: 'long',
    status: 'closed',
    entryPrice: 61200,
    exitPrice: 63800,
    size: 0.08,
    leverage: 10,
    stopPrice: 60200,
    targetPrice: 64500,
    fees: 4.9,
    openedAt: 1,
    closedAt: 2,
    strategy: null,
    notes: null,
    tags: [],
    createdAt: 1,
    updatedAt: 2,
  })
  await legacy.table('assets').add({
    id: 'legacy-asset',
    symbol: 'BTC',
    name: null,
    quantity: 1,
    averageCost: 1,
    currentPrice: null,
    notes: null,
    createdAt: 1,
    updatedAt: 2,
  })
  if (preferences) {
    await legacy.table('settings').add({
      key: 'preferences',
      value: preferences,
      updatedAt: 1,
    })
  }
  legacy.close()
}

describe('market backfill migration', () => {
  beforeEach(async () => {
    await Dexie.delete(DB_NAME)
  })

  afterEach(async () => {
    await Dexie.delete(DB_NAME)
  })

  it('adds an unspecified market to legacy trades and assets', async () => {
    await seedLegacyDatabase()

    const trade = await db.trades.get('legacy-trade')
    const asset = await db.assets.get('legacy-asset')

    expect(trade?.market).toBe('unspecified')
    expect(asset?.market).toBe('unspecified')
  })
})

describe('preferences backfill migration', () => {
  beforeEach(async () => {
    await Dexie.delete(DB_NAME)
  })

  afterEach(async () => {
    await Dexie.delete(DB_NAME)
  })

  it('preserves an explicit preferences row', async () => {
    await seedLegacyDatabase({
      currency: 'EUR',
      defaultMarket: 'crypto',
      accountSize: 5000,
      riskPercent: 2,
      leverage: 20,
      feePercent: 0.1,
      maintenanceMarginPercent: 1,
      defaultTimeRange: '90d',
      feesInRisk: false,
      language: 'fa',
    })

    const row = await db.settings.get('preferences')
    const value = row?.value as Record<string, unknown>

    expect(value.defaultMarket).toBe('crypto')
    expect(value.currency).toBe('EUR')
    expect(value.accountSize).toBe(5000)
    expect(value.language).toBe('fa')
  })

  it('backfills defaultMarket on a v1 preferences row', async () => {
    await seedLegacyDatabase({
      currency: 'EUR',
      accountSize: 5000,
      riskPercent: 2,
      leverage: 20,
      feePercent: 0.1,
      maintenanceMarginPercent: 1,
      defaultTimeRange: '90d',
      feesInRisk: false,
      language: null,
    })

    const row = await db.settings.get('preferences')
    const value = row?.value as Record<string, unknown>

    expect(value.defaultMarket).toBe('unspecified')
    expect(value.currency).toBe('EUR')
    expect(value.accountSize).toBe(5000)
  })

  it('replaces an invalid defaultMarket while keeping other values', async () => {
    await seedLegacyDatabase({
      currency: 'EUR',
      defaultMarket: 'not-a-market',
      accountSize: 5000,
    })

    const row = await db.settings.get('preferences')
    const value = row?.value as Record<string, unknown>

    expect(value.defaultMarket).toBe('unspecified')
    expect(value.currency).toBe('EUR')
    expect(value.accountSize).toBe(5000)
  })
})
