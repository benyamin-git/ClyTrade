import { newId } from '@/lib/id'
import { db } from '../db'
import { assetDraftSchema, type Asset, type AssetDraft } from '../models/asset'

export async function listAssets(): Promise<Asset[]> {
  return db.assets.orderBy('symbol').toArray()
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  return db.assets.get(id)
}

export async function createAsset(draft: AssetDraft): Promise<Asset> {
  const parsed = assetDraftSchema.parse(draft)
  const now = Date.now()
  const asset: Asset = { ...parsed, id: newId(), createdAt: now, updatedAt: now }
  await db.assets.add(asset)
  return asset
}

export async function updateAsset(id: string, patch: Partial<AssetDraft>): Promise<void> {
  await db.assets.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteAsset(id: string): Promise<void> {
  await db.assets.delete(id)
}

export async function replaceAllAssets(assets: Asset[]): Promise<void> {
  await db.transaction('rw', db.assets, async () => {
    await db.assets.clear()
    await db.assets.bulkAdd(assets)
  })
}

export async function mergeAssets(assets: Asset[]): Promise<void> {
  await db.assets.bulkPut(assets)
}

export async function clearAssets(): Promise<void> {
  await db.assets.clear()
}
