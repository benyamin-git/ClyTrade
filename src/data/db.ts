import Dexie, { type EntityTable } from 'dexie'
import type { Asset } from './models/asset'
import type { SettingRow } from './models/settings'
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
  }
}

export const db = new ClyTradeDatabase()
