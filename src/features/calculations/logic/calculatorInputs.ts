import { useSyncExternalStore } from 'react'

export interface CalculatorInputs {
  risk: number | null
  entryPrice: number | null
  targetPrice: number | null
  stopPrice: number | null
  feePercent: number | null
  leverage: number | null
  maintenanceMarginPercent: number | null
  winRatePercent: number | null
}

const EMPTY: CalculatorInputs = {
  risk: null,
  entryPrice: null,
  targetPrice: null,
  stopPrice: null,
  feePercent: null,
  leverage: null,
  maintenanceMarginPercent: null,
  winRatePercent: null,
}

let state = EMPTY
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setCalculatorInput<K extends keyof CalculatorInputs>(
  key: K,
  value: CalculatorInputs[K],
): void {
  state = { ...state, [key]: value }
  for (const listener of listeners) listener()
}

export function resetCalculatorInputs(): void {
  state = EMPTY
  for (const listener of listeners) listener()
}

export function applyCalculatorDefaults(
  defaults: Pick<CalculatorInputs, 'leverage' | 'feePercent' | 'maintenanceMarginPercent'>,
): void {
  if (state !== EMPTY) return
  state = { ...state, ...defaults }
  for (const listener of listeners) listener()
}

export function useCalculatorInputs(): CalculatorInputs {
  return useSyncExternalStore(subscribe, () => state)
}
