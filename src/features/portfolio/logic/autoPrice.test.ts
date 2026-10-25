import { describe, expect, it } from 'vitest'
import type { Asset } from '@/data/models/asset'
import { STALE_MS, type ProviderPrice } from '@/market/types'
import { shouldWriteAutoPrice } from './autoPrice'

const NOW = 1_700_000_000_000

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    symbol: 'BTC',
    market: 'crypto',
    name: null,
    quantity: 1,
    averageCost: 100,
    currentPrice: null,
    notes: null,
    autoPrice: true,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function price(overrides: Partial<ProviderPrice> = {}): ProviderPrice {
  return {
    key: 'binance:BTCUSDT',
    symbol: 'BTC',
    provider: 'binance',
    price: 68000,
    fetchedAt: NOW,
    sourceTimestamp: null,
    ...overrides,
  }
}

describe('shouldWriteAutoPrice', () => {
  it('writes a fresh price for an opted-in crypto asset', () => {
    expect(shouldWriteAutoPrice(asset(), price(), NOW, STALE_MS)).toBe(true)
  })

  it('ignores assets outside the crypto market', () => {
    expect(shouldWriteAutoPrice(asset({ market: 'forex' }), price(), NOW, STALE_MS)).toBe(false)
  })

  it('ignores assets that did not opt into automatic prices', () => {
    expect(shouldWriteAutoPrice(asset({ autoPrice: false }), price(), NOW, STALE_MS)).toBe(false)
  })

  it('ignores a missing price', () => {
    expect(shouldWriteAutoPrice(asset(), undefined, NOW, STALE_MS)).toBe(false)
  })

  it('ignores a price at or past the stale threshold', () => {
    expect(shouldWriteAutoPrice(asset(), price({ fetchedAt: NOW - STALE_MS }), NOW, STALE_MS)).toBe(
      false,
    )
  })

  it('accepts a price one millisecond inside the stale threshold', () => {
    expect(
      shouldWriteAutoPrice(asset(), price({ fetchedAt: NOW - STALE_MS + 1 }), NOW, STALE_MS),
    ).toBe(true)
  })

  it('ignores a price that matches the stored current price', () => {
    expect(shouldWriteAutoPrice(asset({ currentPrice: 68000 }), price(), NOW, STALE_MS)).toBe(false)
  })

  it('writes when the stored current price differs', () => {
    expect(shouldWriteAutoPrice(asset({ currentPrice: 67000 }), price(), NOW, STALE_MS)).toBe(true)
  })
})
