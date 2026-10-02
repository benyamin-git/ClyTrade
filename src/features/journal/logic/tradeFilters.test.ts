import { describe, expect, it } from 'vitest'
import type { TradeMetricsResult } from '@/calculations/tradeMetrics'
import type { Trade } from '@/data/models/trade'
import { EMPTY_RANGE, activeGroupCount } from '@/features/filters/filterUtils'
import { en } from '@/i18n/en'
import { createTranslator } from '@/i18n/translate'
import { toTradeRows, type TradeRow } from './tradeRows'
import {
  DEFAULT_TRADE_FILTERS,
  TRADE_FILTER_GROUPS,
  buildTradeChips,
  filterTrades,
  tradeNumericBounds,
  tradeStrategyOptions,
  tradeTagOptions,
  type TradeFilters,
} from './tradeFilters'

const t = createTranslator(en)

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    symbol: 'BTCUSDT',
    market: 'crypto',
    direction: 'long',
    status: 'closed',
    entryPrice: 100,
    exitPrice: 110,
    size: 1,
    leverage: 10,
    stopPrice: 95,
    targetPrice: 120,
    fees: 0,
    openedAt: 1_000,
    closedAt: 2_000,
    strategy: null,
    notes: null,
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function makeRow(overrides: Partial<Trade> = {}, metrics?: TradeMetricsResult | null): TradeRow {
  const trade = makeTrade(overrides)
  if (metrics !== undefined) return { trade, metrics }
  const rows = toTradeRows([trade], false)
  const row = rows[0]
  if (!row) throw new Error('expected a trade row')
  return row
}

function withFilters(partial: Partial<TradeFilters>): TradeFilters {
  return { ...DEFAULT_TRADE_FILTERS, ...partial }
}

function ids(rows: readonly TradeRow[]): string[] {
  return rows.map((row) => row.trade.id)
}

describe('DEFAULT_TRADE_FILTERS', () => {
  it('is all-inactive', () => {
    expect(activeGroupCount(DEFAULT_TRADE_FILTERS, TRADE_FILTER_GROUPS)).toBe(0)
  })

  it('does not share the EMPTY_RANGE reference', () => {
    const ranges = [
      DEFAULT_TRADE_FILTERS.opened,
      DEFAULT_TRADE_FILTERS.closed,
      DEFAULT_TRADE_FILTERS.entry,
      DEFAULT_TRADE_FILTERS.exit,
      DEFAULT_TRADE_FILTERS.size,
      DEFAULT_TRADE_FILTERS.leverage,
      DEFAULT_TRADE_FILTERS.fees,
      DEFAULT_TRADE_FILTERS.netPnl,
      DEFAULT_TRADE_FILTERS.rMultiple,
      DEFAULT_TRADE_FILTERS.duration,
    ]
    for (const range of ranges) {
      expect(range).toEqual(EMPTY_RANGE)
      expect(range).not.toBe(EMPTY_RANGE)
    }
  })
})

describe('filterTrades', () => {
  it('passes every row when filters are empty', () => {
    const rows = [makeRow({ id: 'a' }), makeRow({ id: 'b', market: 'stocks' })]
    expect(filterTrades(rows, DEFAULT_TRADE_FILTERS)).toEqual(rows)
  })

  it.each([
    ['aapl', { symbol: 'AAPL' }, true],
    ['BREAKOUT', { strategy: 'Breakout' }, true],
    ['earnings', { notes: 'Earnings play' }, true],
    ['momentum', { tags: ['momentum', 'breakout'] }, true],
    ['missing', { symbol: 'AAPL' }, false],
  ] as const)('search %s against %j -> %s', (search, overrides, expected) => {
    const row = makeRow(overrides as Partial<Trade>)
    expect(ids(filterTrades([row], withFilters({ search })))).toEqual(
      expected ? [row.trade.id] : [],
    )
  })

  it('matches any selected market', () => {
    const rows = [
      makeRow({ id: 'crypto', market: 'crypto' }),
      makeRow({ id: 'stocks', market: 'stocks' }),
      makeRow({ id: 'forex', market: 'forex' }),
    ]
    expect(ids(filterTrades(rows, withFilters({ markets: ['crypto', 'stocks'] })))).toEqual([
      'crypto',
      'stocks',
    ])
  })

  it('filters direction', () => {
    const rows = [makeRow({ id: 'long' }), makeRow({ id: 'short', direction: 'short' })]
    expect(ids(filterTrades(rows, withFilters({ direction: 'short' })))).toEqual(['short'])
    expect(ids(filterTrades(rows, withFilters({ direction: 'long' })))).toEqual(['long'])
    expect(ids(filterTrades(rows, withFilters({ direction: 'all' })))).toEqual(['long', 'short'])
  })

  it('filters status by closedAt', () => {
    const open = makeRow({ id: 'open', status: 'open', exitPrice: null, closedAt: null })
    const closed = makeRow({ id: 'closed' })
    const rows = [open, closed]
    expect(ids(filterTrades(rows, withFilters({ status: 'open' })))).toEqual(['open'])
    expect(ids(filterTrades(rows, withFilters({ status: 'closed' })))).toEqual(['closed'])
    expect(ids(filterTrades(rows, withFilters({ status: 'all' })))).toEqual(['open', 'closed'])
  })

  it('matches any selected tag', () => {
    const rows = [
      makeRow({ id: 'a', tags: ['a'] }),
      makeRow({ id: 'b', tags: ['b', 'c'] }),
      makeRow({ id: 'c', tags: ['c'] }),
      makeRow({ id: 'none', tags: [] }),
    ]
    expect(ids(filterTrades(rows, withFilters({ tags: ['a', 'c'] })))).toEqual(['a', 'b', 'c'])
  })

  it('matches any selected strategy and excludes null strategies', () => {
    const rows = [
      makeRow({ id: 'breakout', strategy: 'Breakout' }),
      makeRow({ id: 'reversal', strategy: 'Reversal' }),
      makeRow({ id: 'none', strategy: null }),
    ]
    expect(ids(filterTrades(rows, withFilters({ strategies: ['Breakout', 'Reversal'] })))).toEqual([
      'breakout',
      'reversal',
    ])
    expect(ids(filterTrades(rows, withFilters({ strategies: ['Reversal'] })))).toEqual(['reversal'])
  })

  it.each([
    ['opened', { opened: { min: 1_500, max: null } }, { openedAt: 2_000 }, true],
    ['opened below', { opened: { min: 2_500, max: null } }, { openedAt: 2_000 }, false],
    ['closed', { closed: { min: null, max: 2_500 } }, { closedAt: 2_400 }, true],
    ['entry', { entry: { min: 100, max: 200 } }, { entryPrice: 150 }, true],
    ['entry above', { entry: { min: 100, max: 200 } }, { entryPrice: 250 }, false],
    ['exit', { exit: { min: 110, max: null } }, { exitPrice: 120 }, true],
    [
      'exit null',
      { exit: { min: 0, max: null } },
      { exitPrice: null, status: 'open', closedAt: null },
      false,
    ],
    ['size', { size: { min: 2, max: null } }, { size: 3 }, true],
    ['leverage', { leverage: { max: 5 } }, { leverage: 10 }, false],
    ['fees', { fees: { max: 0 } }, { fees: 0 }, true],
    ['netPnl', { netPnl: { min: 0, max: null } }, {}, true],
    ['netPnl loss', { netPnl: { max: -1 } }, {}, false],
    ['rMultiple', { rMultiple: { min: 1, max: null } }, {}, true],
    ['duration', { duration: { min: 500, max: 2_000 } }, {}, true],
    ['duration long', { duration: { min: 5_000, max: null } }, {}, false],
  ] as const)('range %s against %j -> %s', (_label, range, overrides, expected) => {
    const row = makeRow(overrides as Partial<Trade>)
    expect(ids(filterTrades([row], withFilters(range as Partial<TradeFilters>)))).toEqual(
      expected ? [row.trade.id] : [],
    )
  })

  it('excludes rows with null metrics from metric filters', () => {
    const open = makeRow({ id: 'open', status: 'open', exitPrice: null, closedAt: null })
    const nullMetrics: TradeRow = { trade: makeTrade({ id: 'null' }), metrics: null }
    const rows = [open, nullMetrics]

    expect(ids(filterTrades(rows, withFilters({ netPnl: { min: 0, max: null } })))).toEqual([])
    expect(ids(filterTrades(rows, withFilters({ rMultiple: { min: 0, max: null } })))).toEqual([])
    expect(ids(filterTrades(rows, withFilters({ duration: { min: 0, max: null } })))).toEqual([])
    expect(ids(filterTrades(rows, withFilters({ outcome: 'win' })))).toEqual([])
    expect(ids(filterTrades(rows, withFilters({ outcome: 'breakeven' })))).toEqual([])
  })

  it('matches the closed range on closedAt only, regardless of metrics', () => {
    const open = makeRow({ id: 'open', status: 'open', exitPrice: null, closedAt: null })
    const nullMetrics: TradeRow = { trade: makeTrade({ id: 'null' }), metrics: null }
    const rows = [open, nullMetrics]

    expect(ids(filterTrades(rows, withFilters({ closed: { min: 0, max: null } })))).toEqual([
      'null',
    ])
    expect(ids(filterTrades(rows, withFilters({ closed: { min: 3_000, max: null } })))).toEqual([])
  })

  it('classifies outcome by net PnL sign', () => {
    const rows = [
      makeRow({ id: 'win' }),
      makeRow({ id: 'loss', exitPrice: 90 }),
      makeRow({ id: 'flat', exitPrice: 100 }),
    ]
    expect(ids(filterTrades(rows, withFilters({ outcome: 'win' })))).toEqual(['win'])
    expect(ids(filterTrades(rows, withFilters({ outcome: 'loss' })))).toEqual(['loss'])
    expect(ids(filterTrades(rows, withFilters({ outcome: 'breakeven' })))).toEqual(['flat'])
    expect(ids(filterTrades(rows, withFilters({ outcome: 'all' })))).toEqual([
      'win',
      'loss',
      'flat',
    ])
  })

  it('applies presence filters', () => {
    const rows = [
      makeRow({ id: 'full', stopPrice: 90, targetPrice: 130, notes: 'ok', tags: ['x'] }),
      makeRow({ id: 'bare', stopPrice: null, targetPrice: null, notes: null, tags: [] }),
      makeRow({ id: 'blank', stopPrice: 90, targetPrice: 130, notes: '', tags: [] }),
    ]
    expect(ids(filterTrades(rows, withFilters({ hasStop: 'has' })))).toEqual(['full', 'blank'])
    expect(ids(filterTrades(rows, withFilters({ hasStop: 'missing' })))).toEqual(['bare'])
    expect(ids(filterTrades(rows, withFilters({ hasTarget: 'has' })))).toEqual(['full', 'blank'])
    expect(ids(filterTrades(rows, withFilters({ hasNotes: 'has' })))).toEqual(['full'])
    expect(ids(filterTrades(rows, withFilters({ hasNotes: 'missing' })))).toEqual(['bare', 'blank'])
    expect(ids(filterTrades(rows, withFilters({ hasTags: 'has' })))).toEqual(['full'])
    expect(ids(filterTrades(rows, withFilters({ hasTags: 'missing' })))).toEqual(['bare', 'blank'])
  })

  it('combines active groups with AND', () => {
    const rows = [
      makeRow({ id: 'match', market: 'crypto', direction: 'long' }),
      makeRow({ id: 'wrong-market', market: 'stocks', direction: 'long' }),
      makeRow({ id: 'wrong-direction', market: 'crypto', direction: 'short' }),
    ]
    expect(
      ids(filterTrades(rows, withFilters({ markets: ['crypto'], direction: 'long' }))),
    ).toEqual(['match'])
  })
})

describe('TRADE_FILTER_GROUPS', () => {
  it('has one entry per control', () => {
    expect(TRADE_FILTER_GROUPS.map((group) => group.id)).toEqual([
      'text',
      'market',
      'direction',
      'status',
      'tags',
      'strategies',
      'dates',
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
          direction: 'long',
          status: 'open',
          tags: ['a', 'b'],
          strategies: ['s'],
          opened: { min: 1, max: null },
          closed: { min: 1, max: null },
          entry: { min: 1, max: null },
          size: { min: 1, max: null },
          fees: { min: 1, max: null },
          netPnl: { min: 0, max: null },
          outcome: 'win',
          hasStop: 'has',
          hasTags: 'missing',
        }),
        TRADE_FILTER_GROUPS,
      ),
    ).toBe(11)
  })

  it('clears each group independently', () => {
    const active = withFilters({
      search: 'x',
      markets: ['crypto'],
      direction: 'long',
      status: 'open',
      tags: ['a'],
      strategies: ['s'],
      opened: { min: 1, max: null },
      entry: { min: 1, max: null },
      netPnl: { min: 0, max: null },
      outcome: 'win',
      hasStop: 'has',
    })

    const cleared = TRADE_FILTER_GROUPS.reduce((filters, group) => group.clear(filters), active)
    expect(activeGroupCount(cleared, TRADE_FILTER_GROUPS)).toBe(0)
  })

  it('does not share range references when clearing', () => {
    const cleared = TRADE_FILTER_GROUPS.reduce(
      (filters, group) => group.clear(filters),
      withFilters({}),
    )
    expect(cleared.opened).not.toBe(EMPTY_RANGE)
    expect(cleared.closed).not.toBe(EMPTY_RANGE)
    expect(cleared.entry).not.toBe(EMPTY_RANGE)
    expect(cleared.exit).not.toBe(EMPTY_RANGE)
    expect(cleared.size).not.toBe(EMPTY_RANGE)
    expect(cleared.leverage).not.toBe(EMPTY_RANGE)
    expect(cleared.fees).not.toBe(EMPTY_RANGE)
    expect(cleared.netPnl).not.toBe(EMPTY_RANGE)
    expect(cleared.rMultiple).not.toBe(EMPTY_RANGE)
    expect(cleared.duration).not.toBe(EMPTY_RANGE)
  })
})

describe('buildTradeChips', () => {
  it('returns no chips for defaults', () => {
    expect(buildTradeChips(DEFAULT_TRADE_FILTERS, t)).toEqual([])
  })

  it('labels search, markets, direction, status and outcome', () => {
    const chips = buildTradeChips(
      withFilters({
        search: 'btc',
        markets: ['crypto'],
        direction: 'long',
        status: 'open',
        outcome: 'win',
      }),
      t,
    )
    expect(chips.map((chip) => chip.label)).toEqual([
      'Search: btc',
      'Crypto',
      'Long',
      'Open',
      'Wins',
    ])
  })

  it('labels a range with describeRange', () => {
    const chips = buildTradeChips(withFilters({ entry: { min: 100, max: 200 } }), t)
    expect(chips).toHaveLength(1)
    expect(chips[0]?.label).toBe('Entry price: 100 – 200')
  })

  it('emits one chip per active range with the right ids', () => {
    const chips = buildTradeChips(
      withFilters({
        opened: { min: 1, max: null },
        closed: { min: null, max: 2 },
        exit: { min: 3, max: null },
        size: { min: 4, max: null },
        leverage: { min: 5, max: null },
        fees: { min: 6, max: null },
        netPnl: { min: 7, max: null },
        rMultiple: { min: 8, max: null },
        duration: { min: 9, max: null },
      }),
      t,
    )
    expect(chips.map((chip) => chip.id)).toEqual([
      'opened',
      'closed',
      'exit',
      'size',
      'leverage',
      'fees',
      'netPnl',
      'rMultiple',
      'duration',
    ])
  })

  it('labels presence filters with their has key', () => {
    const chips = buildTradeChips(withFilters({ hasStop: 'has', hasNotes: 'missing' }), t)
    expect(chips.map((chip) => chip.label)).toEqual(['Has stop', 'Has notes'])
  })

  it('clears only the targeted value', () => {
    const filters = withFilters({ markets: ['crypto', 'stocks'], tags: ['a', 'b'] })
    const chips = buildTradeChips(filters, t)
    const marketChip = chips.find((chip) => chip.id === 'market:crypto')
    const tagChip = chips.find((chip) => chip.id === 'tag:a')

    expect(marketChip?.clear(filters)).toEqual(
      withFilters({ markets: ['stocks'], tags: ['a', 'b'] }),
    )
    expect(tagChip?.clear(filters)).toEqual(
      withFilters({ markets: ['crypto', 'stocks'], tags: ['b'] }),
    )
  })

  it('clears range chips to fresh empty ranges', () => {
    const filters = withFilters({ opened: { min: 1, max: null }, closed: { min: null, max: 2 } })
    const chips = buildTradeChips(filters, t)
    for (const id of ['opened', 'closed'] as const) {
      const chip = chips.find((item) => item.id === id)
      if (!chip) throw new Error(`missing chip ${id}`)
      const cleared = chip.clear(filters)
      expect(cleared[id]).toEqual(EMPTY_RANGE)
      expect(cleared[id]).not.toBe(EMPTY_RANGE)
    }
  })
})

describe('tradeTagOptions', () => {
  it('returns distinct sorted tags across all trades', () => {
    const trades = [
      makeTrade({ id: '1', tags: ['b', 'a'] }),
      makeTrade({ id: '2', tags: ['a', 'c'] }),
      makeTrade({ id: '3', tags: [] }),
    ]
    expect(tradeTagOptions(trades)).toEqual(['a', 'b', 'c'])
  })
})

describe('tradeStrategyOptions', () => {
  it('returns distinct sorted non-null strategies across all trades', () => {
    const trades = [
      makeTrade({ id: '1', strategy: 'Breakout' }),
      makeTrade({ id: '2', strategy: 'Reversal' }),
      makeTrade({ id: '3', strategy: 'Breakout' }),
      makeTrade({ id: '4', strategy: null }),
    ]
    expect(tradeStrategyOptions(trades)).toEqual(['Breakout', 'Reversal'])
  })
})

describe('tradeNumericBounds', () => {
  it('computes bounds across every row', () => {
    const rows = [
      makeRow({
        id: 'a',
        openedAt: 1_000,
        closedAt: 3_000,
        entryPrice: 100,
        exitPrice: 120,
        size: 2,
        leverage: 5,
        fees: 1,
      }),
      makeRow({
        id: 'b',
        openedAt: 500,
        closedAt: 2_000,
        entryPrice: 50,
        exitPrice: 60,
        size: 1,
        leverage: 10,
        fees: 0,
      }),
    ]
    const bounds = tradeNumericBounds(rows)
    expect(bounds.opened).toEqual({ min: 500, max: 1_000 })
    expect(bounds.closed).toEqual({ min: 2_000, max: 3_000 })
    expect(bounds.entry).toEqual({ min: 50, max: 100 })
    expect(bounds.exit).toEqual({ min: 60, max: 120 })
    expect(bounds.size).toEqual({ min: 1, max: 2 })
    expect(bounds.leverage).toEqual({ min: 5, max: 10 })
    expect(bounds.fees).toEqual({ min: 0, max: 1 })
    expect(bounds.netPnl).toEqual({ min: 10, max: 39 })
    expect(bounds.rMultiple.min).toBeCloseTo(10 / 45)
    expect(bounds.rMultiple.max).toBeCloseTo(3.9)
    expect(bounds.duration).toEqual({ min: 1_500, max: 2_000 })
  })

  it('returns zeroed bounds for no rows', () => {
    const bounds = tradeNumericBounds([])
    expect(bounds.opened).toEqual({ min: 0, max: 0 })
    expect(bounds.closed).toEqual({ min: 0, max: 0 })
    expect(bounds.netPnl).toEqual({ min: 0, max: 0 })
    expect(bounds.rMultiple).toEqual({ min: 0, max: 0 })
    expect(bounds.duration).toEqual({ min: 0, max: 0 })
  })

  it('collapses to a degenerate domain for a single value', () => {
    const rows = [makeRow({ id: 'only' })]
    const bounds = tradeNumericBounds(rows)
    expect(bounds.opened).toEqual({ min: 1_000, max: 1_000 })
    expect(bounds.closed).toEqual({ min: 2_000, max: 2_000 })
    expect(bounds.entry).toEqual({ min: 100, max: 100 })
    expect(bounds.size).toEqual({ min: 1, max: 1 })
  })

  it('ignores null timestamps and null metrics', () => {
    const rows = [
      makeRow({ id: 'open', status: 'open', exitPrice: null, closedAt: null }),
      {
        trade: makeTrade({ id: 'null', status: 'open', exitPrice: null, closedAt: null }),
        metrics: null,
      },
    ]
    const bounds = tradeNumericBounds(rows)
    expect(bounds.closed).toEqual({ min: 0, max: 0 })
    expect(bounds.exit).toEqual({ min: 0, max: 0 })
    expect(bounds.netPnl).toEqual({ min: 0, max: 0 })
    expect(bounds.rMultiple).toEqual({ min: 0, max: 0 })
    expect(bounds.duration).toEqual({ min: 0, max: 0 })
  })
})
