import { newId } from '@/lib/id'
import { db } from '../db'
import { tradeDraftSchema, type Trade, type TradeDraft } from '../models/trade'

export async function listTrades(): Promise<Trade[]> {
  return db.trades.orderBy('openedAt').reverse().toArray()
}

export async function getTrade(id: string): Promise<Trade | undefined> {
  return db.trades.get(id)
}

export async function createTrade(draft: TradeDraft): Promise<Trade> {
  const parsed = tradeDraftSchema.parse(draft)
  const now = Date.now()
  const trade: Trade = { ...parsed, id: newId(), createdAt: now, updatedAt: now }
  await db.trades.add(trade)
  return trade
}

export async function updateTrade(id: string, patch: Partial<TradeDraft>): Promise<void> {
  await db.trades.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteTrade(id: string): Promise<void> {
  await db.trades.delete(id)
}

export async function replaceAllTrades(trades: Trade[]): Promise<void> {
  await db.transaction('rw', db.trades, async () => {
    await db.trades.clear()
    await db.trades.bulkAdd(trades)
  })
}

export async function mergeTrades(trades: Trade[]): Promise<void> {
  await db.trades.bulkPut(trades)
}

export async function clearTrades(): Promise<void> {
  await db.trades.clear()
}
