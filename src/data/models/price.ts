import { z } from 'zod'

const positivePrice = z.number().finite().positive()

export const priceProviderSchema = z.enum(['binance', 'coingecko'])
export type PriceProviderId = z.infer<typeof priceProviderSchema>

export const priceProviderChoiceSchema = z.enum(['auto', 'binance', 'coingecko'])
export type PriceProviderChoice = z.infer<typeof priceProviderChoiceSchema>

export const priceCacheEntrySchema = z.object({
  key: z.string(),
  symbol: z.string(),
  provider: priceProviderSchema,
  price: positivePrice,
  fetchedAt: z.number(),
  sourceTimestamp: z.number().nullable(),
})
export type PriceCacheEntry = z.infer<typeof priceCacheEntrySchema>

export const marketSymbolSchema = z.object({
  id: z.string(),
  provider: priceProviderSchema,
  priceId: z.string(),
  symbol: z.string(),
  name: z.string().nullable(),
  quote: z.string().nullable(),
  rank: z.number().int().nullable(),
  updatedAt: z.number(),
})
export type MarketSymbol = z.infer<typeof marketSymbolSchema>

export const alertRepeatSchema = z.enum(['once', 'cross-back', 'cooldown'])
export type AlertRepeat = z.infer<typeof alertRepeatSchema>

export const alertPriceModeSchema = z.enum(['above', 'below', 'crossing', 'range'])
export type AlertPriceMode = z.infer<typeof alertPriceModeSchema>

export const alertPercentDirectionSchema = z.enum(['up', 'down', 'both'])
export type AlertPercentDirection = z.infer<typeof alertPercentDirectionSchema>

export const priceAlertSchema = z.object({
  id: z.string(),
  kind: z.enum(['price', 'percent']),
  symbol: z.string().min(1),
  binanceSymbol: z.string().nullable(),
  coingeckoId: z.string().nullable(),
  priceMode: alertPriceModeSchema.nullable(),
  level: positivePrice.nullable(),
  rangeLow: positivePrice.nullable(),
  rangeHigh: positivePrice.nullable(),
  percent: positivePrice.nullable(),
  percentDirection: alertPercentDirectionSchema.nullable(),
  repeat: alertRepeatSchema,
  cooldownMinutes: z.number().int().min(15).max(1440),
  referencePrice: positivePrice.nullable(),
  lastPrice: positivePrice.nullable(),
  armed: z.boolean(),
  enabled: z.boolean(),
  note: z.string().nullable(),
  lastFiredAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type PriceAlert = z.infer<typeof priceAlertSchema>
export type PriceAlertDraft = Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'>

export const alertEventKindSchema = z.enum([
  'target',
  'stop',
  'level',
  'percent',
  'gap',
  'stale',
  'conflict',
])
export type AlertEventKind = z.infer<typeof alertEventKindSchema>

export const alertEventStatusSchema = z.enum(['unread', 'read', 'resolved', 'dismissed'])
export type AlertEventStatus = z.infer<typeof alertEventStatusSchema>

export const alertResolutionSchema = z.enum(['target', 'stop', 'edit', 'dismiss'])
export type AlertResolution = z.infer<typeof alertResolutionSchema>

export const alertEventSchema = z.object({
  id: z.string(),
  kind: alertEventKindSchema,
  tradeId: z.string().nullable(),
  ruleId: z.string().nullable(),
  symbol: z.string(),
  price: positivePrice,
  level: positivePrice.nullable(),
  targetPrice: positivePrice.nullable(),
  stopPrice: positivePrice.nullable(),
  at: z.number(),
  provider: priceProviderSchema.nullable(),
  status: alertEventStatusSchema,
  resolution: alertResolutionSchema.nullable(),
  readAt: z.number().nullable(),
  createdAt: z.number(),
})
export type AlertEvent = z.infer<typeof alertEventSchema>
export type AlertEventDraft = Omit<AlertEvent, 'id' | 'createdAt'>
