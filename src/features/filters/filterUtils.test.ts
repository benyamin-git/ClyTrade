import { describe, expect, it } from 'vitest'
import type { FilterGroupDescriptor, Range } from './filterTypes'
import {
  EMPTY_RANGE,
  activeGroupCount,
  inRange,
  isRangeActive,
  matchesText,
  matchesTriState,
  toggleInArray,
  withRangeBound,
} from './filterUtils'

describe('EMPTY_RANGE', () => {
  it('has no bounds', () => {
    expect(EMPTY_RANGE).toEqual({ min: null, max: null })
  })
})

describe('isRangeActive', () => {
  it.each([
    [EMPTY_RANGE, false],
    [{ min: 0, max: null }, true],
    [{ min: null, max: 0 }, true],
    [{ min: -5, max: 5 }, true],
  ] as const)('reports %j as %s', (range, expected) => {
    expect(isRangeActive(range)).toBe(expected)
  })
})

describe('inRange', () => {
  it.each([
    [5, EMPTY_RANGE, true],
    [5, { min: 5, max: null }, true],
    [5, { min: null, max: 5 }, true],
    [5, { min: 1, max: 10 }, true],
    [1, { min: 1, max: 10 }, true],
    [10, { min: 1, max: 10 }, true],
    [0.999, { min: 1, max: 10 }, false],
    [10.001, { min: 1, max: 10 }, false],
    [-3, { min: -10, max: -1 }, true],
    [-0.5, { min: null, max: -1 }, false],
  ] as const)('checks %s against %j as %s', (value, range, expected) => {
    expect(inRange(value, range)).toBe(expected)
  })
})

describe('matchesText', () => {
  it.each([
    [[], '', true],
    [[null, undefined], '', true],
    [['AAPL'], '', true],
    [[null, undefined], 'aapl', false],
    [[null, undefined, 'AAPL'], 'aapl', true],
    [['AAPL', 'MSFT'], ' msf ', true],
    [['AAPL'], 'aapl', true],
    [['AAPL'], 'AAPL', true],
    [['Hello World'], 'world', true],
    [['AAPL'], 'msft', false],
  ] as const)('matches needle %j in %j as %s', (values, needle, expected) => {
    expect(matchesText(values, needle)).toBe(expected)
  })
})

describe('matchesTriState', () => {
  it.each([
    [true, 'any', true],
    [false, 'any', true],
    [true, 'has', true],
    [false, 'has', false],
    [true, 'missing', false],
    [false, 'missing', true],
  ] as const)('matches present=%s against %s as %s', (present, state, expected) => {
    expect(matchesTriState(present, state)).toBe(expected)
  })
})

describe('toggleInArray', () => {
  it.each([
    [[], 'a', ['a']],
    [['a'], 'b', ['a', 'b']],
    [['a', 'b', 'c'], 'b', ['a', 'c']],
    [['b', 'a', 'b'], 'b', ['a']],
  ] as const)('toggles %j with %j to %j', (values, value, expected) => {
    expect(toggleInArray(values, value)).toEqual(expected)
  })

  it.each([
    [[], 1, [1]],
    [[1, 3], 2, [1, 3, 2]],
    [[1, 2], 2, [1]],
  ] as const)('toggles %j with %j to %j', (values, value, expected) => {
    expect(toggleInArray(values, value)).toEqual(expected)
  })

  it('does not mutate the input', () => {
    const values = ['a', 'b']
    toggleInArray(values, 'a')
    expect(values).toEqual(['a', 'b'])
  })

  it('returns a new array when adding', () => {
    const values = ['a']
    expect(toggleInArray(values, 'b')).not.toBe(values)
  })
})

describe('withRangeBound', () => {
  it.each([
    [EMPTY_RANGE, 'min', 5, { min: 5, max: null }],
    [EMPTY_RANGE, 'max', 5, { min: null, max: 5 }],
    [{ min: 1, max: 2 }, 'max', 9, { min: 1, max: 9 }],
    [{ min: 1, max: 2 }, 'min', null, { min: null, max: 2 }],
    [{ min: 1, max: 2 }, 'max', null, { min: 1, max: null }],
  ] as const)('sets the %s bound of %j to %s', (range, bound, value, expected) => {
    expect(withRangeBound(range, bound, value)).toEqual(expected)
  })

  it('does not mutate the input', () => {
    const range: Range = { min: 1, max: 2 }
    withRangeBound(range, 'min', 5)
    expect(range).toEqual({ min: 1, max: 2 })
  })
})

interface SampleFilters {
  search: string
  markets: string[]
  entry: Range
}

const sampleGroups: readonly FilterGroupDescriptor<SampleFilters>[] = [
  {
    id: 'search',
    labelKey: 'filters.min',
    isActive: (filters) => filters.search !== '',
    clear: (filters) => ({ ...filters, search: '' }),
  },
  {
    id: 'markets',
    labelKey: 'filters.max',
    isActive: (filters) => filters.markets.length > 0,
    clear: (filters) => ({ ...filters, markets: [] }),
  },
  {
    id: 'entry',
    labelKey: 'filters.degenerateRange',
    isActive: (filters) => isRangeActive(filters.entry),
    clear: (filters) => ({ ...filters, entry: EMPTY_RANGE }),
  },
]

describe('activeGroupCount', () => {
  it('counts no groups for defaults', () => {
    expect(activeGroupCount({ search: '', markets: [], entry: EMPTY_RANGE }, sampleGroups)).toBe(0)
  })

  it('counts each active group once', () => {
    expect(
      activeGroupCount({ search: 'aapl', markets: ['stocks'], entry: EMPTY_RANGE }, sampleGroups),
    ).toBe(2)
  })

  it('counts a range group with a single bound', () => {
    expect(
      activeGroupCount({ search: '', markets: [], entry: { min: 5, max: null } }, sampleGroups),
    ).toBe(1)
  })

  it('is zero for an empty group list', () => {
    expect(activeGroupCount({ search: 'aapl', markets: [], entry: EMPTY_RANGE }, [])).toBe(0)
  })
})
