import { describe, expect, it } from 'vitest'
import { createTokenBucket } from './budget'

describe('createTokenBucket', () => {
  it('allows requests up to the per-minute request limit', () => {
    const bucket = createTokenBucket({
      maxRequestsPerMinute: 2,
      maxWeightPerMinute: 100,
      minSpacingMs: 0,
    })

    expect(bucket.canSpend(1, 0)).toBe(true)
    bucket.spend(1, 0)
    expect(bucket.canSpend(1, 0)).toBe(true)
    bucket.spend(1, 0)
    expect(bucket.canSpend(1, 0)).toBe(false)
    expect(bucket.nextAvailableAt(1, 0)).toBe(60_000)
  })

  it('enforces the minimum spacing between requests', () => {
    const bucket = createTokenBucket({
      maxRequestsPerMinute: 10,
      maxWeightPerMinute: 100,
      minSpacingMs: 1_000,
    })

    bucket.spend(1, 0)
    expect(bucket.canSpend(1, 500)).toBe(false)
    expect(bucket.nextAvailableAt(1, 500)).toBe(1_000)
    expect(bucket.canSpend(1, 1_000)).toBe(true)
  })

  it('enforces the weight limit and releases weight after the window', () => {
    const bucket = createTokenBucket({
      maxRequestsPerMinute: 10,
      maxWeightPerMinute: 5,
      minSpacingMs: 0,
    })

    bucket.spend(3, 0)
    expect(bucket.canSpend(3, 0)).toBe(false)
    expect(bucket.nextAvailableAt(3, 0)).toBe(60_000)
    expect(bucket.canSpend(2, 0)).toBe(true)
    expect(bucket.canSpend(3, 60_000)).toBe(true)
  })

  it('releases request slots after the window', () => {
    const bucket = createTokenBucket({
      maxRequestsPerMinute: 1,
      maxWeightPerMinute: 100,
      minSpacingMs: 0,
    })

    bucket.spend(1, 0)
    expect(bucket.canSpend(1, 59_999)).toBe(false)
    expect(bucket.nextAvailableAt(1, 59_999)).toBe(60_000)
    expect(bucket.canSpend(1, 60_000)).toBe(true)
  })

  it('returns now when the request can be spent', () => {
    const bucket = createTokenBucket({
      maxRequestsPerMinute: 1,
      maxWeightPerMinute: 100,
      minSpacingMs: 0,
    })

    expect(bucket.nextAvailableAt(1, 1_234)).toBe(1_234)
  })
})
