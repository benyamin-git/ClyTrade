import { useCallback, useState } from 'react'
import type { UnitMode } from './units'

export const UNIT_MODE_STORAGE_PREFIX = 'clytrade.calcUnit.'

export const UNIT_MODE_KEYS = {
  positionSizeRisk: 'positionSize.risk',
  positionSizeFee: 'positionSize.fee',
  feesPnlEntryFee: 'feesPnl.entryFee',
  feesPnlExitFee: 'feesPnl.exitFee',
  feesPnlFunding: 'feesPnl.funding',
  spotFuturesFee: 'spotFutures.fee',
} as const

function isUnitMode(value: unknown): value is UnitMode {
  return value === 'percent' || value === 'currency'
}

export function readUnitMode(key: string): UnitMode {
  try {
    const stored = localStorage.getItem(`${UNIT_MODE_STORAGE_PREFIX}${key}`)
    return isUnitMode(stored) ? stored : 'percent'
  } catch {
    return 'percent'
  }
}

export function writeUnitMode(key: string, mode: UnitMode): void {
  try {
    localStorage.setItem(`${UNIT_MODE_STORAGE_PREFIX}${key}`, mode)
  } catch {
    // storage unavailable
  }
}

export function useUnitMode(key: string): [UnitMode, (next: string) => void] {
  const [mode, setMode] = useState<UnitMode>(() => readUnitMode(key))
  const update = useCallback(
    (next: string) => {
      if (!isUnitMode(next)) return
      writeUnitMode(key, next)
      setMode(next)
    },
    [key],
  )
  return [mode, update]
}
