import { isFiniteInputs } from './types'

export interface AverageEntryInput {
  existingSize: number
  existingEntryPrice: number
  addSize: number
  addPrice: number
}

export interface AverageEntryResult {
  totalSize: number
  previousNotional: number
  addedNotional: number
  totalNotional: number
  averageEntryPrice: number
  priceChangePercent: number
}

/**
 * Blended entry price when scaling into a position.
 *
 * totalNotional     = existingSize * existingEntryPrice + addSize * addPrice
 * averageEntryPrice = totalNotional / (existingSize + addSize)
 * priceChangePercent = (averageEntryPrice / existingEntryPrice - 1) * 100
 *
 * `existingSize` may be 0 to compute a fresh entry. `addSize` must be > 0.
 */
export function calculateAverageEntry(input: AverageEntryInput): AverageEntryResult | null {
  const { existingSize, existingEntryPrice, addSize, addPrice } = input
  if (!isFiniteInputs([existingSize, existingEntryPrice, addSize, addPrice])) return null
  if (existingSize < 0 || addSize <= 0) return null
  if (existingEntryPrice <= 0 || addPrice <= 0) return null

  const totalSize = existingSize + addSize
  if (totalSize <= 0) return null

  const previousNotional = existingSize * existingEntryPrice
  const addedNotional = addSize * addPrice
  const totalNotional = previousNotional + addedNotional
  const averageEntryPrice = totalNotional / totalSize

  return {
    totalSize,
    previousNotional,
    addedNotional,
    totalNotional,
    averageEntryPrice,
    priceChangePercent: (averageEntryPrice / existingEntryPrice - 1) * 100,
  }
}
