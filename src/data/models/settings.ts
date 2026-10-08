import { z } from 'zod'
import { DEFAULT_MARKET, marketSchema } from './market'

export const timeRangeSchema = z.enum(['7d', '30d', '90d', 'ytd', 'all'])

export const languageSchema = z.enum(['en', 'fa'])

export const PREFERENCE_LIMITS = {
  accountSize: { min: 0, max: Number.POSITIVE_INFINITY },
  riskPercent: { min: 0, max: 100 },
  leverage: { min: 1, max: Number.POSITIVE_INFINITY },
  feePercent: { min: 0, max: Number.POSITIVE_INFINITY },
  maintenanceMarginPercent: { min: 0, max: 100 },
} as const

export type BoundedPreference = keyof typeof PREFERENCE_LIMITS

export const preferencesSchema = z.object({
  currency: z.string().min(1),
  defaultMarket: marketSchema.default(DEFAULT_MARKET),
  accountSize: z.number().min(PREFERENCE_LIMITS.accountSize.min),
  riskPercent: z
    .number()
    .min(PREFERENCE_LIMITS.riskPercent.min)
    .max(PREFERENCE_LIMITS.riskPercent.max),
  leverage: z.number().min(PREFERENCE_LIMITS.leverage.min),
  feePercent: z.number().min(PREFERENCE_LIMITS.feePercent.min),
  maintenanceMarginPercent: z
    .number()
    .min(PREFERENCE_LIMITS.maintenanceMarginPercent.min)
    .max(PREFERENCE_LIMITS.maintenanceMarginPercent.max),
  defaultTimeRange: timeRangeSchema,
  feesInRisk: z.boolean().default(true),
  language: languageSchema.nullable().default(null),
})

export type Preferences = z.infer<typeof preferencesSchema>

export const DEFAULT_PREFERENCES: Preferences = {
  currency: 'USD',
  defaultMarket: 'unspecified',
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
  const source =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    currency: repairField(
      preferencesSchema.shape.currency,
      DEFAULT_PREFERENCES.currency,
      source.currency,
    ),
    defaultMarket: repairField(
      preferencesSchema.shape.defaultMarket,
      DEFAULT_PREFERENCES.defaultMarket,
      source.defaultMarket,
    ),
    accountSize: repairField(
      preferencesSchema.shape.accountSize,
      DEFAULT_PREFERENCES.accountSize,
      source.accountSize,
    ),
    riskPercent: repairField(
      preferencesSchema.shape.riskPercent,
      DEFAULT_PREFERENCES.riskPercent,
      source.riskPercent,
    ),
    leverage: repairField(
      preferencesSchema.shape.leverage,
      DEFAULT_PREFERENCES.leverage,
      source.leverage,
    ),
    feePercent: repairField(
      preferencesSchema.shape.feePercent,
      DEFAULT_PREFERENCES.feePercent,
      source.feePercent,
    ),
    maintenanceMarginPercent: repairField(
      preferencesSchema.shape.maintenanceMarginPercent,
      DEFAULT_PREFERENCES.maintenanceMarginPercent,
      source.maintenanceMarginPercent,
    ),
    defaultTimeRange: repairField(
      preferencesSchema.shape.defaultTimeRange,
      DEFAULT_PREFERENCES.defaultTimeRange,
      source.defaultTimeRange,
    ),
    feesInRisk: repairField(
      preferencesSchema.shape.feesInRisk,
      DEFAULT_PREFERENCES.feesInRisk,
      source.feesInRisk,
    ),
    language: repairField(
      preferencesSchema.shape.language,
      DEFAULT_PREFERENCES.language,
      source.language,
    ),
  }
}

function repairField<T>(schema: z.ZodType<T>, fallback: T, value: unknown): T {
  const result = schema.safeParse(value)
  return result.success ? result.data : fallback
}
