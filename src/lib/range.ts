import { clamp } from './money'

export type RangeScale = 'linear' | 'log'

export function effectiveBounds(
  min: number,
  max: number,
  scale: RangeScale,
): { min: number; max: number } {
  if (scale !== 'log' || max <= 0) return { min, max }
  return { min: min > 0 ? min : Number.EPSILON, max }
}

function usesLog(min: number, max: number, scale: RangeScale): boolean {
  const bounds = effectiveBounds(min, max, scale)
  return scale === 'log' && bounds.min > 0 && bounds.max > bounds.min
}

export function valueToPosition(
  value: number,
  min: number,
  max: number,
  scale: RangeScale,
): number {
  const bounds = effectiveBounds(min, max, scale)
  if (bounds.max <= bounds.min) return 0
  const position = usesLog(min, max, scale)
    ? Math.log(value / bounds.min) / Math.log(bounds.max / bounds.min)
    : (value - bounds.min) / (bounds.max - bounds.min)
  return Number.isFinite(position) ? clamp(position, 0, 1) : 0
}

export function positionToValue(
  position: number,
  min: number,
  max: number,
  scale: RangeScale,
): number {
  const bounds = effectiveBounds(min, max, scale)
  const progress = clamp(position, 0, 1)
  if (bounds.max <= bounds.min) return bounds.min
  if (usesLog(min, max, scale)) {
    return bounds.min * Math.pow(bounds.max / bounds.min, progress)
  }
  return bounds.min + progress * (bounds.max - bounds.min)
}
