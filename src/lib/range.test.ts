import { describe, expect, it } from 'vitest'
import { effectiveBounds, positionToValue, valueToPosition } from './range'

describe('effectiveBounds', () => {
  it.each([
    [0, 100, 'linear', { min: 0, max: 100 }],
    [-10, 10, 'linear', { min: -10, max: 10 }],
    [1, 1000, 'log', { min: 1, max: 1000 }],
  ] as const)('returns the domain for %s..%s on %s', (min, max, scale, expected) => {
    expect(effectiveBounds(min, max, scale)).toEqual(expected)
  })

  it('floors a non-positive lower bound above zero for log', () => {
    const bounds = effectiveBounds(-5, 100, 'log')
    expect(bounds.max).toBe(100)
    expect(bounds.min).toBeGreaterThan(0)
  })

  it('falls back to linear when the whole domain is non-positive for log', () => {
    expect(effectiveBounds(-20, -10, 'log')).toEqual({ min: -20, max: -10 })
  })
})

describe('valueToPosition', () => {
  it.each([
    [0, 0, 100, 'linear', 0],
    [25, 0, 100, 'linear', 0.25],
    [100, 0, 100, 'linear', 1],
    [-25, 0, 100, 'linear', 0],
    [120, 0, 100, 'linear', 1],
    [1, 1, 100, 'log', 0],
    [10, 1, 100, 'log', 0.5],
    [100, 1, 100, 'log', 1],
    [-15, -20, -10, 'log', 0.5],
  ] as const)('maps value %s in %s..%s on %s to %s', (value, min, max, scale, expected) => {
    expect(valueToPosition(value, min, max, scale)).toBeCloseTo(expected, 6)
  })
})

describe('positionToValue', () => {
  it.each([
    [0, 0, 100, 'linear', 0],
    [0.25, 0, 100, 'linear', 25],
    [1, 0, 100, 'linear', 100],
    [0, 1, 100, 'log', 1],
    [0.5, 1, 100, 'log', 10],
    [1, 1, 100, 'log', 100],
    [0.5, -20, -10, 'log', -15],
  ] as const)('maps position %s in %s..%s on %s to %s', (position, min, max, scale, expected) => {
    expect(positionToValue(position, min, max, scale)).toBeCloseTo(expected, 6)
  })
})

describe('round trip', () => {
  it.each([
    [0, 0, 100, 'linear'],
    [25, 0, 100, 'linear'],
    [100, 0, 100, 'linear'],
    [1, 1, 1000, 'log'],
    [10, 1, 1000, 'log'],
    [1000, 1, 1000, 'log'],
    [-15, -20, -10, 'log'],
  ] as const)('round-trips %s in %s..%s on %s', (value, min, max, scale) => {
    expect(positionToValue(valueToPosition(value, min, max, scale), min, max, scale)).toBeCloseTo(
      value,
      6,
    )
  })
})
