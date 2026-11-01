import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetDraft } from '@/data/models/asset'
import type { TradeDraft } from '@/data/models/trade'
import { clearAssets, createAsset, listAssets } from '@/data/repositories/assets.repo'
import { clearTrades, createTrade, listTrades } from '@/data/repositories/trades.repo'
import { clearSettings } from '@/data/repositories/settings.repo'
import type { SymbolCandidate } from './symbols'
import { useSymbolMappingSync } from './useSymbolMappingSync'

const symbols = vi.hoisted(() => ({
  resolveSymbol: vi.fn<() => Promise<SymbolCandidate[]>>(),
}))

vi.mock('./symbols', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./symbols')>()
  return { ...actual, resolveSymbol: symbols.resolveSymbol }
})

function assetDraft(overrides: Partial<AssetDraft> = {}): AssetDraft {
  return {
    symbol: 'BTC',
    market: 'crypto',
    name: null,
    quantity: 1,
    averageCost: 100,
    currentPrice: null,
    notes: null,
    autoPrice: true,
    binanceSymbol: null,
    coingeckoId: null,
    ...overrides,
  }
}

function tradeDraft(overrides: Partial<TradeDraft> = {}): TradeDraft {
  return {
    symbol: 'BTC',
    market: 'crypto',
    direction: 'long',
    status: 'open',
    entryPrice: 100,
    exitPrice: null,
    size: 1,
    leverage: 1,
    stopPrice: 90,
    targetPrice: 120,
    fees: 0,
    openedAt: 1,
    closedAt: null,
    strategy: null,
    notes: null,
    tags: [],
    autoClose: false,
    binanceSymbol: null,
    coingeckoId: null,
    ...overrides,
  }
}

function candidate(overrides: Partial<SymbolCandidate> = {}): SymbolCandidate {
  return {
    provider: 'binance',
    priceId: 'BTCUSDT',
    symbol: 'BTCUSDT',
    name: null,
    quote: 'USDT',
    rank: null,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    ...overrides,
  }
}

describe('useSymbolMappingSync', () => {
  beforeEach(async () => {
    await clearAssets()
    await clearTrades()
    await clearSettings()
    symbols.resolveSymbol.mockReset()
  })

  it('persists a single preferred mapping for an unmapped crypto asset', async () => {
    const asset = await createAsset(assetDraft())
    symbols.resolveSymbol.mockResolvedValue([candidate()])

    renderHook(() => useSymbolMappingSync())

    await waitFor(async () => {
      const [stored] = await listAssets()
      expect(stored?.binanceSymbol).toBe('BTCUSDT')
      expect(stored?.coingeckoId).toBe('bitcoin')
    })
    expect(symbols.resolveSymbol).toHaveBeenCalledOnce()
    expect((await listAssets())[0]?.id).toBe(asset.id)
  })

  it('persists a mapping for an unmapped open crypto trade with levels', async () => {
    await createTrade(tradeDraft())
    symbols.resolveSymbol.mockResolvedValue([candidate()])

    renderHook(() => useSymbolMappingSync())

    await waitFor(async () => {
      const [stored] = await listTrades()
      expect(stored?.binanceSymbol).toBe('BTCUSDT')
    })
  })

  it('persists the Binance USDT pair when providers tie', async () => {
    await createAsset(assetDraft())
    symbols.resolveSymbol.mockResolvedValue([
      candidate(),
      candidate({ provider: 'coingecko', priceId: 'bitcoin', binanceSymbol: null }),
    ])

    renderHook(() => useSymbolMappingSync())

    await waitFor(async () => {
      expect((await listAssets())[0]?.binanceSymbol).toBe('BTCUSDT')
    })
  })

  it('leaves a genuine tie unresolved and does not retry it', async () => {
    await createAsset(assetDraft())
    symbols.resolveSymbol.mockResolvedValue([
      candidate({ priceId: 'BTCUSDC', symbol: 'BTCUSDC', quote: 'USDC' }),
      candidate({ priceId: 'BTCEUR', symbol: 'BTCEUR', quote: 'EUR' }),
    ])

    const { rerender } = renderHook(() => useSymbolMappingSync())
    await waitFor(() => expect(symbols.resolveSymbol).toHaveBeenCalledOnce())

    rerender()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(symbols.resolveSymbol).toHaveBeenCalledOnce()
    expect((await listAssets())[0]?.binanceSymbol).toBeNull()
  })
})
