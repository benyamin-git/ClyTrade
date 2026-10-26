import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetDraft } from '@/data/models/asset'
import { clearAssets, createAsset, updateAsset } from '@/data/repositories/assets.repo'
import type { ProviderPrice } from '@/market/types'
import { useAutoPriceSync } from './useAutoPriceSync'

const marketState = vi.hoisted(() => ({
  prices: new Map() as Map<string, ProviderPrice>,
}))

vi.mock('@/market/usePrices', () => ({
  usePrices: () => ({
    prices: marketState.prices,
    status: {
      provider: 'auto',
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt: null,
      monthlyUsage: null,
      error: null,
    },
    refresh: async () => undefined,
  }),
}))

vi.mock('@/data/repositories/assets.repo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/repositories/assets.repo')>()
  return { ...actual, updateAsset: vi.fn(actual.updateAsset) }
})

function draft(partial: Partial<AssetDraft> & Pick<AssetDraft, 'symbol'>): AssetDraft {
  return {
    market: 'crypto',
    name: null,
    quantity: 1,
    averageCost: 100,
    currentPrice: null,
    notes: null,
    ...partial,
  }
}

function providerPrice(
  overrides: Partial<ProviderPrice> & Pick<ProviderPrice, 'key'>,
): ProviderPrice {
  return {
    symbol: 'BTC',
    provider: 'binance',
    price: 68000,
    fetchedAt: Date.now(),
    sourceTimestamp: null,
    ...overrides,
  }
}

describe('useAutoPriceSync', () => {
  beforeEach(async () => {
    await clearAssets()
    marketState.prices = new Map()
    vi.mocked(updateAsset).mockClear()
  })

  it('writes a fresh crypto price without the portfolio page being mounted', async () => {
    await createAsset(
      draft({
        symbol: 'BTC',
        market: 'crypto',
        autoPrice: true,
        binanceSymbol: 'BTCUSDT',
      }),
    )
    const fetchedAt = Date.now()
    marketState.prices = new Map([
      ['binance:BTCUSDT', providerPrice({ key: 'binance:BTCUSDT', fetchedAt })],
    ])

    renderHook(() => useAutoPriceSync())

    await waitFor(() => expect(vi.mocked(updateAsset)).toHaveBeenCalledTimes(1))
    expect(vi.mocked(updateAsset)).toHaveBeenCalledWith(expect.any(String), {
      currentPrice: 68000,
    })
  })

  it('ignores manual, non-crypto and stale prices', async () => {
    await createAsset(
      draft({ symbol: 'BTC', market: 'crypto', autoPrice: false, binanceSymbol: 'BTCUSDT' }),
    )
    await createAsset(
      draft({ symbol: 'ETH', market: 'forex', autoPrice: true, binanceSymbol: 'ETHUSDT' }),
    )
    await createAsset(
      draft({ symbol: 'SOL', market: 'crypto', autoPrice: true, binanceSymbol: 'SOLUSDT' }),
    )
    const now = Date.now()
    marketState.prices = new Map([
      ['binance:BTCUSDT', providerPrice({ key: 'binance:BTCUSDT', fetchedAt: now })],
      ['binance:ETHUSDT', providerPrice({ key: 'binance:ETHUSDT', symbol: 'ETH', fetchedAt: now })],
      [
        'binance:SOLUSDT',
        providerPrice({
          key: 'binance:SOLUSDT',
          symbol: 'SOL',
          fetchedAt: now - 20 * 60_000,
        }),
      ],
    ])

    renderHook(() => useAutoPriceSync())

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(vi.mocked(updateAsset)).not.toHaveBeenCalled()
  })
})
