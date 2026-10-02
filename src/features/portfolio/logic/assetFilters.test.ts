import { describe, expect, it } from 'vitest'
import type { AssetMetrics } from '@/calculations/portfolioMetrics'
import type { Asset } from '@/data/models/asset'
import { EMPTY_RANGE, activeGroupCount } from '@/features/filters/filterUtils'
import { en } from '@/i18n/en'
import { createTranslator } from '@/i18n/translate'
import {
  ASSET_FILTER_GROUPS,
  DEFAULT_ASSET_FILTERS,
  assetNumericBounds,
  buildAssetChips,
  filterAssets,
  toAssetRows,
  type AssetFilters,
  type AssetRow,
} from './assetFilters'

const t = createTranslator(en)

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    symbol: 'BTC',
    market: 'crypto',
    name: null,
    quantity: 1,
    averageCost: 100,
    currentPrice: 110,
    notes: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function makeRow(overrides: Partial<Asset> = {}, metrics?: AssetMetrics | null): AssetRow {
  const asset = makeAsset(overrides)
  if (metrics !== undefined) return { asset, metrics }
  const rows = toAssetRows([asset])
  const row = rows[0]
  if (!row) throw new Error('expected an asset row')
  return row
}

function withFilters(partial: Partial<AssetFilters>): AssetFilters {
  return { ...DEFAULT_ASSET_FILTERS, ...partial }
}

function ids(rows: readonly AssetRow[]): string[] {
  return rows.map((row) => row.asset.id)
}

describe('DEFAULT_ASSET_FILTERS', () => {
  it('is all-inactive', () => {
    expect(activeGroupCount(DEFAULT_ASSET_FILTERS, ASSET_FILTER_GROUPS)).toBe(0)
  })

  it('does not share the EMPTY_RANGE reference', () => {
    const ranges = [
      DEFAULT_ASSET_FILTERS.quantity,
      DEFAULT_ASSET_FILTERS.avgCost,
      DEFAULT_ASSET_FILTERS.currentPrice,
      DEFAULT_ASSET_FILTERS.value,
      DEFAULT_ASSET_FILTERS.pnl,
      DEFAULT_ASSET_FILTERS.pnlPercent,
    ]
    for (const range of ranges) {
      expect(range).toEqual(EMPTY_RANGE)
      expect(range).not.toBe(EMPTY_RANGE)
    }
  })
})

describe('toAssetRows', () => {
  it('derives metrics from the asset quantity, average cost and current price', () => {
    const rows = toAssetRows([makeAsset({ quantity: 2, averageCost: 100, currentPrice: 120 })])
    const metrics = rows[0]?.metrics
    expect(metrics).toEqual({
      cost: 200,
      value: 240,
      pnl: 40,
      pnlPercent: 20,
      price: 120,
      hasCurrentPrice: true,
    })
  })

  it('values a price-less asset at cost', () => {
    const rows = toAssetRows([makeAsset({ quantity: 2, averageCost: 100, currentPrice: null })])
    const metrics = rows[0]?.metrics
    expect(metrics?.value).toBe(200)
    expect(metrics?.pnl).toBe(0)
    expect(metrics?.hasCurrentPrice).toBe(false)
  })
})

describe('filterAssets', () => {
  it('passes every row when filters are empty', () => {
    const rows = [makeRow({ id: 'a' }), makeRow({ id: 'b', market: 'stocks' })]
    expect(filterAssets(rows, DEFAULT_ASSET_FILTERS)).toEqual(rows)
  })

  it.each([
    ['btc', { symbol: 'BTC' }, true],
    ['APPLE', { name: 'Apple Inc' }, true],
    ['earnings', { notes: 'Earnings play' }, true],
    ['missing', { symbol: 'BTC' }, false],
  ] as const)('search %s against %j -> %s', (search, overrides, expected) => {
    const row = makeRow(overrides as Partial<Asset>)
    expect(ids(filterAssets([row], withFilters({ search })))).toEqual(
      expected ? [row.asset.id] : [],
    )
  })

  it('matches any selected market', () => {
    const rows = [
      makeRow({ id: 'crypto', market: 'crypto' }),
      makeRow({ id: 'stocks', market: 'stocks' }),
      makeRow({ id: 'forex', market: 'forex' }),
    ]
    expect(ids(filterAssets(rows, withFilters({ markets: ['crypto', 'stocks'] })))).toEqual([
      'crypto',
      'stocks',
    ])
  })

  it.each([
    ['quantity', { quantity: { min: 2, max: null } }, { quantity: 3 }, true],
    ['quantity below', { quantity: { min: 2, max: null } }, { quantity: 1 }, false],
    ['avgCost', { avgCost: { min: 100, max: 200 } }, { averageCost: 150 }, true],
    ['avgCost above', { avgCost: { min: 100, max: 200 } }, { averageCost: 250 }, false],
    ['currentPrice', { currentPrice: { min: 100, max: null } }, { currentPrice: 110 }, true],
    ['currentPrice above', { currentPrice: { min: 120, max: null } }, { currentPrice: 110 }, false],
    ['value', { value: { min: 100, max: null } }, { quantity: 1, currentPrice: 110 }, true],
    ['value above', { value: { min: 500, max: null } }, { quantity: 1, currentPrice: 110 }, false],
    ['pnl gain', { pnl: { min: 1, max: null } }, { currentPrice: 110 }, true],
    ['pnl loss', { pnl: { max: -1 } }, { currentPrice: 110 }, false],
    [
      'pnlPercent',
      { pnlPercent: { min: 5, max: null } },
      { averageCost: 100, currentPrice: 110 },
      true,
    ],
    [
      'pnlPercent above',
      { pnlPercent: { min: 20, max: null } },
      { averageCost: 100, currentPrice: 110 },
      false,
    ],
  ] as const)('range %s against %j -> %s', (_label, range, overrides, expected) => {
    const row = makeRow(overrides as Partial<Asset>)
    expect(ids(filterAssets([row], withFilters(range as Partial<AssetFilters>)))).toEqual(
      expected ? [row.asset.id] : [],
    )
  })

  it('excludes a price-less asset from a currentPrice range', () => {
    const row = makeRow({ id: 'no-price', currentPrice: null })
    expect(ids(filterAssets([row], withFilters({ currentPrice: { min: 0, max: null } })))).toEqual(
      [],
    )
  })

  it('excludes a zero-cost asset from a pnlPercent range when the percent is null', () => {
    const row = makeRow({ id: 'zero-cost', quantity: 1, averageCost: 0, currentPrice: 10 })
    expect(row.metrics?.pnlPercent).toBeNull()
    expect(ids(filterAssets([row], withFilters({ pnlPercent: { min: 0, max: null } })))).toEqual([])
  })

  it('uses metrics.pnl for the pnl range so a price-less asset matches a range including 0', () => {
    const row = makeRow({ id: 'no-price', quantity: 2, averageCost: 100, currentPrice: null })
    expect(row.metrics?.pnl).toBe(0)
    expect(ids(filterAssets([row], withFilters({ pnl: { min: 1, max: null } })))).toEqual([])
    expect(ids(filterAssets([row], withFilters({ pnl: { min: 0, max: null } })))).toEqual([
      'no-price',
    ])
    expect(ids(filterAssets([row], withFilters({ pnl: { min: null, max: 0 } })))).toEqual([
      'no-price',
    ])
  })

  it('isolates a price-less asset with hasPrice missing', () => {
    const rows = [
      makeRow({ id: 'priced', currentPrice: 110 }),
      makeRow({ id: 'no-price', currentPrice: null }),
    ]
    expect(ids(filterAssets(rows, withFilters({ hasPrice: 'missing' })))).toEqual(['no-price'])
    expect(ids(filterAssets(rows, withFilters({ hasPrice: 'has' })))).toEqual(['priced'])
    expect(ids(filterAssets(rows, withFilters({ hasPrice: 'any' })))).toEqual([
      'priced',
      'no-price',
    ])
  })

  it('classifies outcome by pnl sign', () => {
    const rows = [
      makeRow({ id: 'gain', currentPrice: 110 }),
      makeRow({ id: 'loss', currentPrice: 90 }),
      makeRow({ id: 'flat', currentPrice: 100 }),
    ]
    expect(ids(filterAssets(rows, withFilters({ outcome: 'gain' })))).toEqual(['gain'])
    expect(ids(filterAssets(rows, withFilters({ outcome: 'loss' })))).toEqual(['loss'])
    expect(ids(filterAssets(rows, withFilters({ outcome: 'breakeven' })))).toEqual(['flat'])
    expect(ids(filterAssets(rows, withFilters({ outcome: 'all' })))).toEqual([
      'gain',
      'loss',
      'flat',
    ])
  })

  it('excludes null metrics from metric filters and outcome', () => {
    const nullMetrics: AssetRow = { asset: makeAsset({ id: 'null' }), metrics: null }
    const rows = [nullMetrics]
    expect(ids(filterAssets(rows, withFilters({ value: { min: 0, max: null } })))).toEqual([])
    expect(ids(filterAssets(rows, withFilters({ pnl: { min: 0, max: null } })))).toEqual([])
    expect(ids(filterAssets(rows, withFilters({ pnlPercent: { min: 0, max: null } })))).toEqual([])
    expect(ids(filterAssets(rows, withFilters({ outcome: 'gain' })))).toEqual([])
    expect(ids(filterAssets(rows, withFilters({ outcome: 'breakeven' })))).toEqual([])
  })

  it('applies presence filters for notes', () => {
    const rows = [
      makeRow({ id: 'full', notes: 'ok' }),
      makeRow({ id: 'bare', notes: null }),
      makeRow({ id: 'blank', notes: '' }),
    ]
    expect(ids(filterAssets(rows, withFilters({ hasNotes: 'has' })))).toEqual(['full'])
    expect(ids(filterAssets(rows, withFilters({ hasNotes: 'missing' })))).toEqual(['bare', 'blank'])
  })

  it('combines active groups with AND', () => {
    const rows = [
      makeRow({ id: 'match', market: 'crypto', currentPrice: 110 }),
      makeRow({ id: 'wrong-market', market: 'stocks', currentPrice: 110 }),
      makeRow({ id: 'wrong-outcome', market: 'crypto', currentPrice: 90 }),
    ]
    expect(ids(filterAssets(rows, withFilters({ markets: ['crypto'], outcome: 'gain' })))).toEqual([
      'match',
    ])
  })
})

describe('ASSET_FILTER_GROUPS', () => {
  it('has one entry per control', () => {
    expect(ASSET_FILTER_GROUPS.map((group) => group.id)).toEqual([
      'text',
      'market',
      'priceSize',
      'performance',
      'outcome',
      'presence',
    ])
  })

  it('counts each group once, not each value', () => {
    expect(
      activeGroupCount(
        withFilters({
          search: 'x',
          markets: ['crypto', 'stocks'],
          quantity: { min: 1, max: null },
          currentPrice: { min: 1, max: null },
          value: { min: 1, max: null },
          pnl: { min: 0, max: null },
          outcome: 'gain',
          hasPrice: 'has',
          hasNotes: 'missing',
        }),
        ASSET_FILTER_GROUPS,
      ),
    ).toBe(6)
  })

  it('clears each group independently', () => {
    const active = withFilters({
      search: 'x',
      markets: ['crypto'],
      quantity: { min: 1, max: null },
      value: { min: 1, max: null },
      outcome: 'gain',
      hasPrice: 'has',
    })

    const cleared = ASSET_FILTER_GROUPS.reduce((filters, group) => group.clear(filters), active)
    expect(activeGroupCount(cleared, ASSET_FILTER_GROUPS)).toBe(0)
  })

  it('does not share range references when clearing', () => {
    const cleared = ASSET_FILTER_GROUPS.reduce(
      (filters, group) => group.clear(filters),
      withFilters({}),
    )
    expect(cleared.quantity).not.toBe(EMPTY_RANGE)
    expect(cleared.avgCost).not.toBe(EMPTY_RANGE)
    expect(cleared.currentPrice).not.toBe(EMPTY_RANGE)
    expect(cleared.value).not.toBe(EMPTY_RANGE)
    expect(cleared.pnl).not.toBe(EMPTY_RANGE)
    expect(cleared.pnlPercent).not.toBe(EMPTY_RANGE)
  })
})

describe('buildAssetChips', () => {
  it('returns no chips for defaults', () => {
    expect(buildAssetChips(DEFAULT_ASSET_FILTERS, t)).toEqual([])
  })

  it('labels search, markets and outcome', () => {
    const chips = buildAssetChips(
      withFilters({ search: 'btc', markets: ['crypto'], outcome: 'gain' }),
      t,
    )
    expect(chips.map((chip) => chip.label)).toEqual(['Search: btc', 'Crypto', 'Gains'])
  })

  it('labels a range with describeRange', () => {
    const chips = buildAssetChips(withFilters({ avgCost: { min: 100, max: 200 } }), t)
    expect(chips).toHaveLength(1)
    expect(chips[0]?.label).toBe('Avg cost: 100 – 200')
  })

  it('emits one chip per active range with the right ids', () => {
    const chips = buildAssetChips(
      withFilters({
        quantity: { min: 1, max: null },
        avgCost: { min: 2, max: null },
        currentPrice: { min: 3, max: null },
        value: { min: 4, max: null },
        pnl: { min: 5, max: null },
        pnlPercent: { min: 6, max: null },
      }),
      t,
    )
    expect(chips.map((chip) => chip.id)).toEqual([
      'quantity',
      'avgCost',
      'currentPrice',
      'value',
      'pnl',
      'pnlPercent',
    ])
  })

  it('labels presence filters with their has key', () => {
    const chips = buildAssetChips(withFilters({ hasPrice: 'has', hasNotes: 'missing' }), t)
    expect(chips.map((chip) => chip.label)).toEqual(['Has price', 'Has notes'])
  })

  it('clears only the targeted value', () => {
    const filters = withFilters({ markets: ['crypto', 'stocks'] })
    const chips = buildAssetChips(filters, t)
    const marketChip = chips.find((chip) => chip.id === 'market:crypto')

    expect(marketChip?.clear(filters)).toEqual(withFilters({ markets: ['stocks'] }))
  })

  it('clears range chips to fresh empty ranges', () => {
    const filters = withFilters({
      quantity: { min: 1, max: null },
      pnl: { min: null, max: 2 },
    })
    const chips = buildAssetChips(filters, t)
    for (const id of ['quantity', 'pnl'] as const) {
      const chip = chips.find((item) => item.id === id)
      if (!chip) throw new Error(`missing chip ${id}`)
      const cleared = chip.clear(filters)
      expect(cleared[id]).toEqual(EMPTY_RANGE)
      expect(cleared[id]).not.toBe(EMPTY_RANGE)
    }
  })
})

describe('assetNumericBounds', () => {
  it('computes bounds across every row', () => {
    const rows = [
      makeRow({ id: 'a', quantity: 2, averageCost: 100, currentPrice: 110 }),
      makeRow({ id: 'b', quantity: 1, averageCost: 50, currentPrice: 60 }),
    ]
    const bounds = assetNumericBounds(rows)
    expect(bounds.quantity).toEqual({ min: 1, max: 2 })
    expect(bounds.avgCost).toEqual({ min: 50, max: 100 })
    expect(bounds.currentPrice).toEqual({ min: 60, max: 110 })
    expect(bounds.value).toEqual({ min: 60, max: 220 })
    expect(bounds.pnl).toEqual({ min: 10, max: 20 })
    expect(bounds.pnlPercent).toEqual({ min: 10, max: 20 })
  })

  it('returns zeroed bounds for no rows', () => {
    const bounds = assetNumericBounds([])
    expect(bounds.quantity).toEqual({ min: 0, max: 0 })
    expect(bounds.avgCost).toEqual({ min: 0, max: 0 })
    expect(bounds.currentPrice).toEqual({ min: 0, max: 0 })
    expect(bounds.value).toEqual({ min: 0, max: 0 })
    expect(bounds.pnl).toEqual({ min: 0, max: 0 })
    expect(bounds.pnlPercent).toEqual({ min: 0, max: 0 })
  })

  it('collapses to a degenerate domain for a single value', () => {
    const rows = [makeRow({ id: 'only' })]
    const bounds = assetNumericBounds(rows)
    expect(bounds.quantity).toEqual({ min: 1, max: 1 })
    expect(bounds.avgCost).toEqual({ min: 100, max: 100 })
    expect(bounds.currentPrice).toEqual({ min: 110, max: 110 })
  })

  it('ignores null prices, null percents and null metrics', () => {
    const rows = [
      makeRow({ id: 'no-price', currentPrice: null }),
      makeRow({ id: 'zero-cost', quantity: 1, averageCost: 0, currentPrice: 10 }),
      { asset: makeAsset({ id: 'null' }), metrics: null },
    ]
    const bounds = assetNumericBounds(rows)
    expect(bounds.currentPrice).toEqual({ min: 10, max: 110 })
    expect(bounds.pnl).toEqual({ min: 0, max: 10 })
    expect(bounds.pnlPercent).toEqual({ min: 0, max: 0 })
  })
})
