import { z } from 'zod'

export const assetSchema = z.object({
  id: z.string(),
  symbol: z.string().min(1),
  name: z.string().nullable(),
  quantity: z.number(),
  averageCost: z.number().min(0),
  currentPrice: z.number().positive().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type Asset = z.infer<typeof assetSchema>

export type AssetDraft = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>

export const assetDraftSchema = assetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
