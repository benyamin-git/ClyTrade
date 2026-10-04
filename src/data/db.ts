import Dexie, { type EntityTable } from 'dexie'
import type { Asset } from './models/asset'
import { DEFAULT_MARKET, marketSchema } from './models/market'
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  type Preferences,
  type SettingRow,
} from './models/settings'
import type { Trade } from './models/trade'

export class ClyTradeDatabase extends Dexie {
  trades!: EntityTable<Trade, 'id'>
  assets!: EntityTable<Asset, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor() {
    super('clytrade')
    this.version(1).stores({
      trades: 'id, symbol, direction, status, openedAt, closedAt, updatedAt',
      assets: 'id, symbol, updatedAt',
      settings: 'key, updatedAt',
    })
    this.version(2)
      .stores({
        trades: 'id, symbol, direction, status, openedAt, closedAt, updatedAt',
        assets: 'id, symbol, updatedAt',
        settings: 'key, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('trades')
          .toCollection()
          .modify((row: { market?: string }) => {
            row.market ??= DEFAULT_MARKET
          })
        await tx
          .table('assets')
          .toCollection()
          .modify((row: { market?: string }) => {
            row.market ??= DEFAULT_MARKET
          })
        await tx
          .table('settings')
          .toCollection()
          .modify((row: SettingRow) => {
            if (row.key !== PREFERENCES_KEY) return
            if (typeof row.value !== 'object' || row.value === null) return
            const value = row.value as Partial<Preferences>
            if (marketSchema.safeParse(value.defaultMarket).success) return
            row.value = {
              ...DEFAULT_PREFERENCES,
              ...value,
              defaultMarket: DEFAULT_MARKET,
            }
            row.updatedAt = Date.now()
          })
      })
  }
}

export const db = new ClyTradeDatabase()
