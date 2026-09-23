import { describe, expect, it } from 'vitest'
import { calculateSpotFutures, type SpotFuturesInput } from './spotFutures'

const base: SpotFuturesInput = {
  capital: 1000,
  price: 100,
  leverage: 10,
  contractSize: 0.1,
  feePercent: 0.05,
  feeAmount: null,
}

describe('calculateSpotFutures', () => {
  it('sizes spot and futures for the same capital', () => {
    const result = calculateSpotFutures(base)
    expect(result?.spotQuantity).toBeCloseTo(10, 10)
    expect(result?.spotNotional).toBeCloseTo(1000, 10)
    expect(result?.spotFee).toBeCloseTo(0.5, 10)
    expect(result?.futuresQuantity).toBeCloseTo(100, 10)
    expect(result?.futuresNotional).toBeCloseTo(10000, 10)
    expect(result?.futuresFee).toBeCloseTo(5, 10)
    expect(result?.futuresContracts).toBeCloseTo(1000, 10)
    expect(result?.liquidationMovePercent).toBeCloseTo(10, 10)
  })

  it('charges an absolute fee per side when provided', () => {
    const result = calculateSpotFutures({ ...base, feePercent: null, feeAmount: 3 })
    expect(result?.spotFee).toBeCloseTo(3, 10)
    expect(result?.futuresFee).toBeCloseTo(3, 10)
    expect(result?.spotQuantity).toBeCloseTo(10, 10)
    expect(result?.futuresQuantity).toBeCloseTo(100, 10)
  })

  it('matches spot at 1x leverage', () => {
    const result = calculateSpotFutures({ ...base, leverage: 1 })
    expect(result?.futuresQuantity).toBeCloseTo(result?.spotQuantity ?? NaN, 10)
    expect(result?.liquidationMovePercent).toBeCloseTo(100, 10)
  })

  it.each([
    ['zero capital', { ...base, capital: 0 }],
    ['zero price', { ...base, price: 0 }],
    ['zero contract size', { ...base, contractSize: 0 }],
    ['leverage below 1', { ...base, leverage: 0 }],
    ['no fee mode', { ...base, feePercent: null }],
    ['both fee modes', { ...base, feeAmount: 3 }],
    ['negative percent fee', { ...base, feePercent: -0.05 }],
    ['negative amount fee', { ...base, feePercent: null, feeAmount: -3 }],
  ])('returns null for %s', (_name, input) => {
    expect(calculateSpotFutures(input)).toBeNull()
  })
})
