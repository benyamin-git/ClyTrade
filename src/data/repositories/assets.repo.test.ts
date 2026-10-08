import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearAssets, createAsset, getAsset, updateAsset } from './assets.repo'
import type { AssetDraft } from '../models/asset'

function makeDraft(): AssetDraft {
  return {
    symbol: 'BTC',
    market: 'crypto',
    name: 'Bitcoin',
    quantity: 1,
    averageCost: 30000,
    currentPrice: 50000,
    notes: null,
  }
}

describe('updateAsset', () => {
  beforeEach(async () => {
    await clearAssets()
  })

  afterEach(async () => {
    await clearAssets()
  })

  it('rejects a zero currentPrice and leaves the stored row unchanged', async () => {
    const asset = await createAsset(makeDraft())

    await expect(updateAsset(asset.id, { currentPrice: 0 })).rejects.toThrow()

    const stored = await getAsset(asset.id)
    expect(stored?.currentPrice).toBe(50000)
  })

  it('rejects an undefined market without persisting it', async () => {
    const asset = await createAsset(makeDraft())

    await expect(
      updateAsset(asset.id, { market: undefined } as unknown as Partial<AssetDraft>),
    ).rejects.toThrow()

    const stored = await getAsset(asset.id)
    expect(stored?.market).toBe('crypto')
  })

  it('persists a valid partial patch', async () => {
    const asset = await createAsset(makeDraft())

    await updateAsset(asset.id, { quantity: 2, currentPrice: 55000 })

    const stored = await getAsset(asset.id)
    expect(stored?.quantity).toBe(2)
    expect(stored?.currentPrice).toBe(55000)
    expect(stored?.symbol).toBe('BTC')
  })
})
