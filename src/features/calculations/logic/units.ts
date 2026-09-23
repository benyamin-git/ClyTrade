export type UnitMode = 'percent' | 'currency'

function isUsableBase(base: number | null | undefined): base is number {
  return base !== null && base !== undefined && Number.isFinite(base) && base > 0
}

export function toPercent(amount: number | null, base: number | null): number | null {
  if (amount === null || !Number.isFinite(amount)) return null
  if (!isUsableBase(base)) return null
  return (amount / base) * 100
}

export function toAmount(percent: number | null, base: number | null): number | null {
  if (percent === null || !Number.isFinite(percent)) return null
  if (!isUsableBase(base)) return null
  return (percent / 100) * base
}

export function convertUnit(
  value: number | null,
  from: UnitMode,
  to: UnitMode,
  base: number | null,
): number | null {
  if (value === null || from === to) return value
  return from === 'percent' ? toAmount(value, base) : toPercent(value, base)
}
