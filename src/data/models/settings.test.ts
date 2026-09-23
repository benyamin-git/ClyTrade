import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, parsePreferences } from './settings'

describe('parsePreferences', () => {
  it('falls back to defaults for invalid values', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences({ currency: '' })).toEqual(DEFAULT_PREFERENCES)
  })

  it('defaults feesInRisk to true for stored preferences without it', () => {
    const legacy = {
      currency: 'EUR',
      accountSize: 5000,
      riskPercent: 2,
      leverage: 5,
      feePercent: 0.04,
      maintenanceMarginPercent: 0.4,
      defaultTimeRange: '90d',
    }
    expect(parsePreferences(legacy)).toEqual({ ...legacy, feesInRisk: true })
  })

  it('keeps an explicit feesInRisk choice', () => {
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, feesInRisk: false }).feesInRisk).toBe(false)
  })
})
