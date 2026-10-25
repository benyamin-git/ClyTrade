import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SymbolCandidate } from './symbols'
import type { MarketProvider } from './types'
import { useSymbolCandidates } from './useSymbolCandidates'

const symbolState = vi.hoisted(() => ({
  bySymbol: new Map<string, SymbolCandidate[]>(),
}))

vi.mock('./symbols', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./symbols')>()
  return {
    ...actual,
    resolveSymbol: async (input: string) =>
      symbolState.bySymbol.get(input.trim().toUpperCase()) ?? [],
  }
})

const providers: readonly MarketProvider[] = []

function candidate(symbol: string): SymbolCandidate {
  return {
    provider: 'binance',
    priceId: `${symbol}USDT`,
    symbol: `${symbol}USDT`,
    name: null,
    quote: 'USDT',
    rank: null,
    binanceSymbol: `${symbol}USDT`,
    coingeckoId: null,
  }
}

describe('useSymbolCandidates', () => {
  beforeEach(() => {
    symbolState.bySymbol.clear()
  })

  it('starts loading for a non-empty input and resolves candidates', async () => {
    symbolState.bySymbol.set('BTC', [candidate('BTC')])
    const { result } = renderHook(() => useSymbolCandidates('BTC', providers))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))
    expect(result.current.loading).toBe(false)
  })

  it('clears stale candidates when the input changes', async () => {
    symbolState.bySymbol.set('BTC', [candidate('BTC')])
    symbolState.bySymbol.set('ETH', [candidate('ETH')])
    const { result, rerender } = renderHook(
      ({ input }: { input: string }) => useSymbolCandidates(input, providers),
      { initialProps: { input: 'BTC' } },
    )
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))

    rerender({ input: 'ETH' })
    expect(result.current.candidates).toEqual([])
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.candidates[0]?.symbol).toBe('ETHUSDT'))
  })

  it('stops loading and clears candidates for an empty input', async () => {
    symbolState.bySymbol.set('BTC', [candidate('BTC')])
    const { result, rerender } = renderHook(
      ({ input }: { input: string }) => useSymbolCandidates(input, providers),
      { initialProps: { input: 'BTC' } },
    )
    await waitFor(() => expect(result.current.candidates).toHaveLength(1))

    rerender({ input: '' })
    expect(result.current).toEqual({ candidates: [], loading: false, error: null })
  })
})
