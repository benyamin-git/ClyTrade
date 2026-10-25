import { z } from 'zod'
import { DEFAULT_MARKET, marketSchema } from './market'

export const assetSchema = z.object({
  id: z.string(),
  symbol: z.string().min(1),
  market: marketSchema.default(DEFAULT_MARKET),
  name: z.string().nullable(),
  quantity: z.number(),
  averageCost: z.number().min(0),
  currentPrice: z.number().positive().nullable(),
  notes: z.string().nullable(),
  autoPrice: z.boolean().default(false),
  binanceSymbol: z.string().nullable().default(null),
  coingeckoId: z.string().nullable().default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type Asset = z.infer<typeof assetSchema>

export const assetDraftSchema = assetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type AssetDraft = z.input<typeof assetDraftSchema>
