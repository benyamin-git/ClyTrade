import { z } from 'zod'

export const MARKET_IDS = [
  'unspecified',
  'crypto',
  'forex',
  'stocks',
  'futures',
  'commodities',
  'indices',
  'bonds',
  'options',
] as const

export const marketSchema = z.enum(MARKET_IDS)

export type Market = z.infer<typeof marketSchema>

export const DEFAULT_MARKET: Market = 'unspecified'
