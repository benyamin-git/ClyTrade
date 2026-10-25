import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import { clearPriceCache } from '@/data/repositories/prices.repo'
import { clearSettings, setPreferences } from '@/data/repositories/settings.repo'
import type { MarketRef } from './types'
import { usePrices } from './usePrices'

const REF: MarketRef = {
  key: 'binance:BTCUSDT',
  symbol: 'BTC',
  binanceSymbol: 'BTCUSDT',
  coingeckoId: null,
}

describe('usePrices with the real scheduler', () => {
  beforeEach(async () => {
    await clearPriceCache()
    await clearSettings()
    await setPreferences({ ...DEFAULT_PREFERENCES, priceProvider: 'binance' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches prices through the configured provider', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify([{ symbol: 'BTCUSDT', price: '68000' }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePrices([REF], 'portfolio'))

    await waitFor(() => expect(result.current.prices.get(REF.key)?.price).toBe(68000))
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
