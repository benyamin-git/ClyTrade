import { z } from 'zod'

export const directionSchema = z.enum(['long', 'short'])
export type Direction = z.infer<typeof directionSchema>

export const tradeStatusSchema = z.enum(['open', 'closed'])
export type TradeStatus = z.infer<typeof tradeStatusSchema>

export const tradeSchema = z.object({
  id: z.string(),
  symbol: z.string().min(1),
  direction: directionSchema,
  status: tradeStatusSchema,
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().nullable(),
  size: z.number().positive(),
  leverage: z.number().min(1),
  stopPrice: z.number().positive().nullable(),
  targetPrice: z.number().positive().nullable(),
  fees: z.number().min(0),
  openedAt: z.number(),
  closedAt: z.number().nullable(),
  strategy: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type Trade = z.infer<typeof tradeSchema>

export type TradeDraft = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>

export const tradeDraftSchema = tradeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
