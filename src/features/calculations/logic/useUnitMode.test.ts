import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UNIT_MODE_KEYS, UNIT_MODE_STORAGE_PREFIX, useUnitMode } from './useUnitMode'

describe('useUnitMode', () => {
  it('defaults to percent when nothing is stored', () => {
    const { result } = renderHook(() => useUnitMode(UNIT_MODE_KEYS.positionSizeRisk))

    expect(result.current[0]).toBe('percent')
  })

  it('reads a stored currency choice', () => {
    localStorage.setItem(`${UNIT_MODE_STORAGE_PREFIX}positionSize.risk`, 'currency')

    const { result } = renderHook(() => useUnitMode(UNIT_MODE_KEYS.positionSizeRisk))

    expect(result.current[0]).toBe('currency')
  })

  it('ignores an invalid stored choice', () => {
    localStorage.setItem(`${UNIT_MODE_STORAGE_PREFIX}positionSize.risk`, 'fraction')

    const { result } = renderHook(() => useUnitMode(UNIT_MODE_KEYS.positionSizeRisk))

    expect(result.current[0]).toBe('percent')
  })

  it('persists a change per field', () => {
    const risk = renderHook(() => useUnitMode(UNIT_MODE_KEYS.positionSizeRisk))
    const fee = renderHook(() => useUnitMode(UNIT_MODE_KEYS.positionSizeFee))

    act(() => risk.result.current[1]('currency'))

    expect(risk.result.current[0]).toBe('currency')
    expect(localStorage.getItem(`${UNIT_MODE_STORAGE_PREFIX}positionSize.risk`)).toBe('currency')
    expect(fee.result.current[0]).toBe('percent')
    expect(localStorage.getItem(`${UNIT_MODE_STORAGE_PREFIX}positionSize.fee`)).toBeNull()
  })

  it('ignores a value that is not a unit mode', () => {
    const { result } = renderHook(() => useUnitMode(UNIT_MODE_KEYS.positionSizeRisk))

    act(() => result.current[1]('fraction'))

    expect(result.current[0]).toBe('percent')
    expect(localStorage.getItem(`${UNIT_MODE_STORAGE_PREFIX}positionSize.risk`)).toBeNull()
  })
})
