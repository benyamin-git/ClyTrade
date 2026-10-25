import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import evaluationCases from './fixtures/evaluation-cases.json'
import { evaluatePrices, type AlertRuleUpdate, type EvaluationInput } from './evaluate'
import type { ProviderPrice } from './types'

const providerSchema = z.enum(['binance', 'coingecko'])

const priceSchema = z
  .object({
    key: z.string().min(1),
    symbol: z.string().min(1),
    provider: providerSchema,
    price: z.number().positive(),
    fetchedAt: z.number(),
    sourceTimestamp: z.number().nullable(),
  })
  .strict()

const tradeSchema = z
  .object({
    id: z.string().min(1),
    symbol: z.string().min(1),
    direction: z.enum(['long', 'short']),
    status: z.enum(['open', 'closed']),
    targetPrice: z.number().positive().nullable(),
    stopPrice: z.number().positive().nullable(),
    autoClose: z.boolean(),
    binanceSymbol: z.string().nullable(),
    coingeckoId: z.string().nullable(),
  })
  .strict()

const ruleSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['price', 'percent']),
    symbol: z.string().min(1),
    binanceSymbol: z.string().nullable(),
    coingeckoId: z.string().nullable(),
    priceMode: z.enum(['above', 'below', 'crossing', 'range']).nullable(),
    level: z.number().positive().nullable(),
    rangeLow: z.number().positive().nullable(),
    rangeHigh: z.number().positive().nullable(),
    percent: z.number().positive().nullable(),
    percentDirection: z.enum(['up', 'down', 'both']).nullable(),
    repeat: z.enum(['once', 'cross-back', 'cooldown']),
    cooldownMinutes: z.number().int(),
    referencePrice: z.number().nullable(),
    lastPrice: z.number().positive().nullable(),
    armed: z.boolean(),
    enabled: z.boolean(),
    lastFiredAt: z.number().nullable(),
  })
  .strict()

const eventSchema = z
  .object({
    kind: z.enum(['target', 'stop', 'level', 'percent', 'gap', 'stale', 'conflict']),
    tradeId: z.string().nullable(),
    ruleId: z.string().nullable(),
    symbol: z.string().min(1),
    price: z.number().positive(),
    level: z.number().positive().nullable(),
    targetPrice: z.number().positive().nullable(),
    stopPrice: z.number().positive().nullable(),
    at: z.number(),
    provider: providerSchema.nullable(),
    status: z.enum(['unread', 'read', 'resolved', 'dismissed']),
    resolution: z.enum(['target', 'stop', 'edit', 'dismiss']).nullable(),
    readAt: z.number().nullable(),
  })
  .strict()

const closeSchema = z
  .object({
    tradeId: z.string().min(1),
    level: z.number().positive(),
    reason: z.enum(['target', 'stop']),
    at: z.number(),
    price: z.number().positive(),
  })
  .strict()

const rulePatchSchema = z
  .object({
    armed: z.boolean().optional(),
    enabled: z.boolean().optional(),
    lastFiredAt: z.number().optional(),
    lastPrice: z.number().positive().optional(),
    referencePrice: z.number().positive().optional(),
  })
  .strict()

const ruleUpdateSchema = z
  .object({
    id: z.string().min(1),
    patch: rulePatchSchema,
  })
  .strict()

const caseSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    now: z.number(),
    staleMs: z.number().nonnegative(),
    prices: z.array(priceSchema),
    trades: z.array(tradeSchema),
    rules: z.array(ruleSchema),
    expected: z
      .object({
        events: z.array(eventSchema),
        closes: z.array(closeSchema),
        reviews: z.array(eventSchema),
        ruleUpdates: z.array(ruleUpdateSchema),
      })
      .strict(),
  })
  .strict()

const fixtureSchema = z
  .object({
    version: z.literal(1),
    description: z.string().min(1),
    schema: z.record(z.string(), z.string()),
    cases: z
      .array(caseSchema)
      .min(1)
      .refine(
        (cases) => new Set(cases.map((item) => item.name)).size === cases.length,
        'case names must be unique',
      ),
  })
  .strict()

const fixture = fixtureSchema.parse(evaluationCases)

type FixturePrice = z.infer<typeof priceSchema>
type FixtureTrade = z.infer<typeof tradeSchema>
type FixtureRule = z.infer<typeof ruleSchema>
type FixtureCase = z.infer<typeof caseSchema>

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

function applyRuleUpdates(
  rules: readonly PriceAlert[],
  updates: readonly AlertRuleUpdate[],
): PriceAlert[] {
  return rules.map((rule) => {
    const update = updates.find((candidate) => candidate.id === rule.id)
    return update ? { ...rule, ...update.patch } : rule
  })
}

function replacePrice(
  input: EvaluationInput,
  key: string,
  price: number,
): Map<string, ProviderPrice> {
  const existing = input.prices.get(key)
  if (!existing) throw new Error(`missing price ${key}`)
  return new Map([[key, { ...existing, price }]])
}

describe('evaluatePrices', () => {
  it('parses a versioned fixture with unique named cases', () => {
    expect(fixture.version).toBe(1)
    expect(fixture.cases.length).toBeGreaterThan(0)
    expect(new Set(fixture.cases.map((item) => item.name)).size).toBe(fixture.cases.length)
  })

  it('rejects a malformed fixture', () => {
    const first = fixture.cases[0]
    if (!first) throw new Error('missing fixture case')

    expect(() => fixtureSchema.parse({ ...fixture, cases: [{ ...first, name: '' }] })).toThrow()
    expect(() => fixtureSchema.parse({ ...fixture, cases: [first, first] })).toThrow()
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

  it('emits every stale review without a level', () => {
    for (const item of fixture.cases) {
      const result = evaluatePrices(buildInput(item))
      for (const review of result.reviews.filter((event) => event.kind === 'stale')) {
        expect(review.level, item.name).toBeNull()
      }
    }
  })

  it('emits stale reviews regardless of cooldown or armed state', () => {
    for (const name of ['rule-stale-cooldown-blocked', 'rule-stale-unarmed-cross-back']) {
      const item = fixture.cases.find((candidate) => candidate.name === name)
      if (!item) throw new Error(`missing ${name} fixture`)

      const result = evaluatePrices(buildInput(item))
      expect(result.reviews, name).toHaveLength(1)
      expect(result.reviews[0]?.level, name).toBeNull()
      expect(result.ruleUpdates, name).toEqual([])
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
      prices: replacePrice(firstInput, 'binance:BTCUSDT', 111),
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

  it('re-arms a crossing cross-back rule on the crossing back and fires on the next cross', () => {
    const item = fixture.cases.find(
      (candidate) => candidate.name === 'rule-crossing-cross-back-fire-after-rearm',
    )
    if (!item) throw new Error('missing rule-crossing-cross-back-fire-after-rearm fixture')

    const base = buildInput(item)
    const rule = base.rules[0]
    if (!rule) throw new Error('missing crossing rule')

    const fired = { ...rule, armed: false, lastPrice: 105 }
    const crossingBack = evaluatePrices({
      ...base,
      prices: replacePrice(base, 'binance:BTCUSDT', 95),
      rules: [fired],
    })
    expect(crossingBack.events).toEqual([])
    expect(crossingBack.ruleUpdates).toEqual([
      {
        id: 'r1',
        patch: {
          lastPrice: 95,
          armed: true,
        },
      },
    ])

    const afterRearm = applyRuleUpdates([fired], crossingBack.ruleUpdates)
    const crossingBackToFiredSide = evaluatePrices({
      ...base,
      prices: replacePrice(base, 'binance:BTCUSDT', 105),
      rules: afterRearm,
    })
    expect(crossingBackToFiredSide.events).toHaveLength(1)
    expect(crossingBackToFiredSide.ruleUpdates).toEqual([
      {
        id: 'r1',
        patch: {
          lastPrice: 105,
          lastFiredAt: base.now,
          armed: false,
        },
      },
    ])
  })
})
