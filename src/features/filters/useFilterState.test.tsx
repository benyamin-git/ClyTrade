import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Range } from './filterTypes'
import { EMPTY_RANGE } from './filterUtils'
import { useFilterState } from './useFilterState'

interface TestFilters {
  search: string
  markets: string[]
  entry: Range
  onlyWin: boolean
}

function makeDefaults(): TestFilters {
  return { search: '', markets: [], entry: EMPTY_RANGE, onlyWin: false }
}

describe('useFilterState', () => {
  it('starts from the provided defaults', () => {
    const defaults = makeDefaults()
    const { result } = renderHook(() => useFilterState(defaults))
    expect(result.current.filters).toEqual(defaults)
  })

  it('hands back a copy rather than the defaults object', () => {
    const defaults = makeDefaults()
    const { result } = renderHook(() => useFilterState(defaults))
    expect(result.current.filters).not.toBe(defaults)
  })

  it('merges a partial patch without dropping other fields', () => {
    const defaults = makeDefaults()
    const { result } = renderHook(() => useFilterState(defaults))

    act(() => {
      result.current.patch({ search: 'aapl' })
    })

    expect(result.current.filters).toEqual({ ...defaults, search: 'aapl' })
  })

  it('patches fields across calls', () => {
    const defaults = makeDefaults()
    const { result } = renderHook(() => useFilterState(defaults))

    act(() => {
      result.current.patch({ search: 'aapl' })
    })
    act(() => {
      result.current.patch({ markets: ['stocks'] })
    })

    expect(result.current.filters).toEqual({ ...defaults, search: 'aapl', markets: ['stocks'] })
  })

  it('does not mutate the defaults object', () => {
    const defaults = makeDefaults()
    const { result } = renderHook(() => useFilterState(defaults))

    act(() => {
      result.current.patch({ search: 'aapl', markets: ['stocks'] })
    })

    expect(defaults).toEqual(makeDefaults())
  })

  it('reset restores the defaults after patches', () => {
    const defaults = makeDefaults()
    const { result } = renderHook(() => useFilterState(defaults))

    act(() => {
      result.current.patch({ search: 'aapl', entry: { min: 1, max: 2 } })
    })
    act(() => {
      result.current.reset()
    })

    expect(result.current.filters).toEqual(defaults)
  })

  it('reset hands back a fresh object each time', () => {
    const defaults = makeDefaults()
    const { result } = renderHook(() => useFilterState(defaults))

    const first = result.current.filters
    act(() => {
      result.current.reset()
    })
    expect(result.current.filters).not.toBe(first)

    const second = result.current.filters
    act(() => {
      result.current.reset()
    })
    expect(result.current.filters).not.toBe(second)
  })
})
