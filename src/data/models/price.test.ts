import { describe, expect, it } from 'vitest'
import { assetDraftSchema } from './asset'
import {
  alertEventSchema,
  alertResolutionSchema,
  priceAlertSchema,
  priceCacheEntrySchema,
  priceProviderChoiceSchema,
} from './price'
import { tradeDraftSchema } from './trade'

const validPriceAlert = {
  id: 'alert-1',
  kind: 'price',
  symbol: 'BTC',
  binanceSymbol: 'BTCUSDT',
  coingeckoId: 'bitcoin',
  priceMode: 'above',
  level: 70000,
  rangeLow: null,
  rangeHigh: null,
  percent: null,
  percentDirection: null,
  repeat: 'once',
  cooldownMinutes: 60,
  referencePrice: null,
  lastPrice: 68000,
  armed: true,
  enabled: true,
  note: null,
  lastFiredAt: null,
  createdAt: 1,
  updatedAt: 1,
} as const

const validAlertEvent = {
  id: 'event-1',
  kind: 'gap',
  tradeId: 'trade-1',
  ruleId: null,
  symbol: 'BTCUSDT',
  price: 65000,
  level: null,
  targetPrice: 70000,
  stopPrice: 60000,
  at: 2,
  provider: 'binance',
  status: 'unread',
  resolution: null,
  readAt: null,
  createdAt: 2,
} as const

describe('priceCacheEntrySchema', () => {
  it('accepts a valid cached price', () => {
    expect(
      priceCacheEntrySchema.safeParse({
        key: 'binance:BTCUSDT',
        symbol: 'BTCUSDT',
        provider: 'binance',
        price: 68000,
        fetchedAt: 1,
        sourceTimestamp: null,
      }).success,
    ).toBe(true)
  })

  it('rejects non-positive prices', () => {
    for (const price of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        priceCacheEntrySchema.safeParse({
          key: 'binance:BTCUSDT',
          symbol: 'BTCUSDT',
          provider: 'binance',
          price,
          fetchedAt: 1,
          sourceTimestamp: null,
        }).success,
      ).toBe(false)
    }
  })
})

describe('priceProviderChoiceSchema', () => {
  it('accepts auto and both providers only', () => {
    for (const value of ['auto', 'binance', 'coingecko']) {
      expect(priceProviderChoiceSchema.safeParse(value).success).toBe(true)
    }
    expect(priceProviderChoiceSchema.safeParse('kraken').success).toBe(false)
  })
})

describe('priceAlertSchema', () => {
  it('accepts a price rule', () => {
    expect(priceAlertSchema.safeParse(validPriceAlert).success).toBe(true)
  })

  it('accepts a percent rule', () => {
    expect(
      priceAlertSchema.safeParse({
        ...validPriceAlert,
        kind: 'percent',
        priceMode: null,
        level: null,
        percent: 5,
        percentDirection: 'both',
        referencePrice: 68000,
      }).success,
    ).toBe(true)
  })

  it('rejects a cooldown outside 15 minutes to 24 hours', () => {
    for (const cooldownMinutes of [14, 1441]) {
      expect(priceAlertSchema.safeParse({ ...validPriceAlert, cooldownMinutes }).success).toBe(
        false,
      )
    }
  })

  it('rejects a non-positive percent', () => {
    expect(
      priceAlertSchema.safeParse({
        ...validPriceAlert,
        kind: 'percent',
        priceMode: null,
        level: null,
        percent: 0,
        percentDirection: 'up',
        referencePrice: 68000,
      }).success,
    ).toBe(false)
  })
})

describe('alertEventSchema', () => {
  it('accepts a gap event with both trade levels', () => {
    expect(alertEventSchema.safeParse(validAlertEvent).success).toBe(true)
  })

  it('rejects a non-positive event price', () => {
    expect(alertEventSchema.safeParse({ ...validAlertEvent, price: 0 }).success).toBe(false)
  })

  it('accepts the refresh resolution alongside the existing resolutions', () => {
    for (const resolution of ['target', 'stop', 'edit', 'dismiss', 'refresh']) {
      expect(alertResolutionSchema.safeParse(resolution).success).toBe(true)
    }
  })
})

describe('trade and asset defaults', () => {
  it('defaults auto-close and provider mappings on a trade draft', () => {
    const parsed = tradeDraftSchema.parse({
      symbol: 'BTCUSDT',
      direction: 'long',
      status: 'open',
      entryPrice: 68000,
      exitPrice: null,
      size: 0.1,
      leverage: 10,
      stopPrice: 66000,
      targetPrice: 72000,
      fees: 1,
      openedAt: 1,
      closedAt: null,
      strategy: null,
      notes: null,
      tags: [],
    })

    expect(parsed.autoClose).toBe(false)
    expect(parsed.binanceSymbol).toBeNull()
    expect(parsed.coingeckoId).toBeNull()
  })

  it('defaults auto-price and provider mappings on an asset draft', () => {
    const parsed = assetDraftSchema.parse({
      symbol: 'BTC',
      market: 'crypto',
      name: null,
      quantity: 1,
      averageCost: 1,
      currentPrice: null,
      notes: null,
    })

    expect(parsed.autoPrice).toBe(false)
    expect(parsed.binanceSymbol).toBeNull()
    expect(parsed.coingeckoId).toBeNull()
  })
})
