import { z } from 'zod'

export const timeRangeSchema = z.enum(['7d', '30d', '90d', 'ytd', 'all'])

export const languageSchema = z.enum(['en', 'fa'])

export const preferencesSchema = z.object({
  currency: z.string().min(1),
  accountSize: z.number().positive(),
  riskPercent: z.number().min(0).max(100),
  leverage: z.number().min(1),
  feePercent: z.number().min(0),
  maintenanceMarginPercent: z.number().min(0).max(100),
  defaultTimeRange: timeRangeSchema,
  feesInRisk: z.boolean().default(true),
  language: languageSchema.nullable().default(null),
})

export type Preferences = z.infer<typeof preferencesSchema>

export const DEFAULT_PREFERENCES: Preferences = {
  currency: 'USD',
  accountSize: 1000,
  riskPercent: 1,
  leverage: 10,
  feePercent: 0.05,
  maintenanceMarginPercent: 0.5,
  defaultTimeRange: '30d',
  feesInRisk: true,
  language: null,
}

export interface SettingRow {
  key: string
  value: unknown
  updatedAt: number
}

export const PREFERENCES_KEY = 'preferences'

export function parsePreferences(value: unknown): Preferences {
  const result = preferencesSchema.safeParse(value)
  if (!result.success) return DEFAULT_PREFERENCES
  return result.data
}
