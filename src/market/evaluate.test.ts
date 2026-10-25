import { describe, expect, it } from 'vitest'
import type { AlertEventDraft, PriceAlert, PriceProviderId } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import evaluationCases from './fixtures/evaluation-cases.json'
import {
  evaluatePrices,
  type AlertRuleUpdate,
  type AutoCloseDraft,
  type EvaluationInput,
} from './evaluate'
import type { ProviderPrice } from './types'

interface FixturePrice {
  key: string
  symbol: string
  provider: PriceProviderId
  price: number
  fetchedAt: number
  sourceTimestamp: number | null
}

interface FixtureTrade {
  id: string
  symbol: string
  direction: 'long' | 'short'
  status: 'open' | 'closed'
  targetPrice: number | null
  stopPrice: number | null
  autoClose: boolean
  binanceSymbol: string | null
  coingeckoId: string | null
}

interface FixtureRule {
  id: string
  kind: 'price' | 'percent'
  symbol: string
  binanceSymbol: string | null
  coingeckoId: string | null
  priceMode: 'above' | 'below' | 'crossing' | 'range' | null
  level: number | null
  rangeLow: number | null
  rangeHigh: number | null
  percent: number | null
  percentDirection: 'up' | 'down' | 'both' | null
  repeat: 'once' | 'cross-back' | 'cooldown'
  cooldownMinutes: number
  referencePrice: number | null
  lastPrice: number | null
  armed: boolean
  enabled: boolean
  lastFiredAt: number | null
}

interface FixtureCase {
  name: string
  description: string
  now: number
  staleMs: number
  prices: FixturePrice[]
  trades: FixtureTrade[]
  rules: FixtureRule[]
  expected: {
    events: AlertEventDraft[]
    closes: AutoCloseDraft[]
    reviews: AlertEventDraft[]
    ruleUpdates: AlertRuleUpdate[]
  }
}

interface FixtureFile {
  version: number
  description: string
  schema: Record<string, string>
  cases: FixtureCase[]
}

const fixture = evaluationCases as unknown as FixtureFile

const EVENT_KEYS = [
  'at',
  'kind',
  'level',
  'price',
  'provider',
  'readAt',
  'resolution',
  'ruleId',
  'status',
  'stopPrice',
  'symbol',
  'targetPrice',
  'tradeId',
].sort()

const MUTABLE_RULE_FIELDS = new Set([
  'armed',
  'enabled',
  'lastFiredAt',
  'lastPrice',
  'referencePrice',
])

function toPrice(input: FixturePrice): ProviderPrice {
  return {
    key: input.key,
    symbol: input.symbol,
    provider: input.provider,
    price: input.price,
    fetchedAt: input.fetchedAt,
    sourceTimestamp: input.sourceTimestamp,
  }
}

function toTrade(input: FixtureTrade): Trade {
  return {
    id: input.id,
    symbol: input.symbol,
    market: 'crypto',
    direction: input.direction,
    status: input.status,
    entryPrice: 1,
    exitPrice: null,
    size: 1,
    leverage: 1,
    stopPrice: input.stopPrice,
    targetPrice: input.targetPrice,
    fees: 0,
    openedAt: 0,
    closedAt: null,
    strategy: null,
    notes: null,
    tags: [],
    autoClose: input.autoClose,
    binanceSymbol: input.binanceSymbol,
    coingeckoId: input.coingeckoId,
    createdAt: 0,
    updatedAt: 0,
  }
}

function toRule(input: FixtureRule): PriceAlert {
  return {
    ...input,
    note: null,
    createdAt: 0,
    updatedAt: 0,
  }
}

function buildInput(item: FixtureCase): EvaluationInput {
  const prices = new Map<string, ProviderPrice>()
  for (const price of item.prices) {
    prices.set(price.key, toPrice(price))
  }
  return {
    now: item.now,
    prices,
    trades: item.trades.map(toTrade),
    rules: item.rules.map(toRule),
    staleMs: item.staleMs,
  }
}

function applyRuleUpdates(rules: readonly PriceAlert[], updates: readonly AlertRuleUpdate[]) {
  return rules.map((rule) => {
    const update = updates.find((candidate) => candidate.id === rule.id)
    return update ? { ...rule, ...update.patch } : rule
  })
}

describe('evaluatePrices', () => {
  it('loads a versioned fixture with unique named cases', () => {
    expect(fixture.version).toBe(1)
    expect(fixture.cases.length).toBeGreaterThan(0)
    expect(new Set(fixture.cases.map((item) => item.name)).size).toBe(fixture.cases.length)
  })

  describe.each(fixture.cases.map((item) => [item.name, item] as const))('%s', (_name, item) => {
    it(item.description, () => {
      expect(evaluatePrices(buildInput(item))).toEqual(item.expected)
    })
  })

  it('fills every event and review field and leaves new items unread', () => {
    for (const item of fixture.cases) {
      const result = evaluatePrices(buildInput(item))
      for (const event of [...result.events, ...result.reviews]) {
        expect(Object.keys(event).sort(), item.name).toEqual(EVENT_KEYS)
        expect(event.status, item.name).toBe('unread')
        expect(event.resolution, item.name).toBeNull()
        expect(event.readAt, item.name).toBeNull()
      }
    }
  })

  it('only patches mutable rule fields', () => {
    for (const item of fixture.cases) {
      const result = evaluatePrices(buildInput(item))
      for (const update of result.ruleUpdates) {
        for (const key of Object.keys(update.patch)) {
          expect(MUTABLE_RULE_FIELDS.has(key), `${item.name}: ${key}`).toBe(true)
        }
      }
    }
  })

  it('does not mutate its input and is deterministic', () => {
    const item = fixture.cases.find((candidate) => candidate.name === 'mixed-trade-and-rule-events')
    if (!item) throw new Error('missing mixed-trade-and-rule-events fixture')

    const input = buildInput(item)
    const snapshot = {
      now: input.now,
      staleMs: input.staleMs,
      prices: [...input.prices.entries()].map(([key, price]) => [key, { ...price }] as const),
      trades: structuredClone(input.trades),
      rules: structuredClone(input.rules),
    }

    const first = evaluatePrices(input)
    const second = evaluatePrices(input)

    expect(first).toEqual(second)
    expect(input.now).toBe(snapshot.now)
    expect(input.staleMs).toBe(snapshot.staleMs)
    expect([...input.prices.entries()].map(([key, price]) => [key, { ...price }] as const)).toEqual(
      snapshot.prices,
    )
    expect(input.trades).toEqual(snapshot.trades)
    expect(input.rules).toEqual(snapshot.rules)
  })

  it('resets a percent reference after a fire and re-arms a cross-back rule', () => {
    const item = fixture.cases.find(
      (candidate) => candidate.name === 'rule-percent-cross-back-fires',
    )
    if (!item) throw new Error('missing rule-percent-cross-back-fires fixture')

    const firstInput = buildInput(item)
    const first = evaluatePrices(firstInput)
    expect(first.events).toHaveLength(1)
    expect(first.ruleUpdates).toEqual([
      {
        id: 'r1',
        patch: {
          lastPrice: 105,
          lastFiredAt: firstInput.now,
          armed: false,
          referencePrice: 105,
        },
      },
    ])

    const afterFire = applyRuleUpdates(firstInput.rules, first.ruleUpdates)
    const armed = evaluatePrices({
      ...firstInput,
      rules: afterFire,
    })
    expect(armed.events).toEqual([])
    expect(armed.ruleUpdates).toEqual([{ id: 'r1', patch: { armed: true } }])

    const afterRearm = applyRuleUpdates(afterFire, armed.ruleUpdates)
    const moved = evaluatePrices({
      ...firstInput,
      prices: new Map([
        [
          'binance:BTCUSDT',
          {
            ...firstInput.prices.get('binance:BTCUSDT'),
            price: 111,
          } as ProviderPrice,
        ],
      ]),
      rules: afterRearm,
    })
    expect(moved.events).toHaveLength(1)
    expect(moved.ruleUpdates).toEqual([
      {
        id: 'r1',
        patch: {
          lastPrice: 111,
          lastFiredAt: firstInput.now,
          armed: false,
          referencePrice: 111,
        },
      },
    ])
  })
})
