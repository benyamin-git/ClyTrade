import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, parsePreferences } from './settings'

describe('parsePreferences', () => {
  it('falls back to defaults for invalid values', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences({ currency: '' })).toEqual(DEFAULT_PREFERENCES)
  })

  it('defaults new fields for stored preferences without them', () => {
    const legacy = {
      currency: 'EUR',
      accountSize: 5000,
      riskPercent: 2,
      leverage: 5,
      feePercent: 0.04,
      maintenanceMarginPercent: 0.4,
      defaultTimeRange: '90d',
    }
    expect(parsePreferences(legacy)).toEqual({
      ...legacy,
      feesInRisk: true,
      language: null,
      defaultMarket: 'unspecified',
      priceProvider: 'auto',
      autoCloseByDefault: false,
      notificationsEnabled: false,
      backgroundMonitoring: false,
      windowsCloseBehavior: 'unset',
    })
  })

  it('keeps an explicit default market', () => {
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'forex' }).defaultMarket).toBe(
      'forex',
    )
  })

  it('keeps an explicit feesInRisk choice', () => {
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, feesInRisk: false }).feesInRisk).toBe(false)
  })

  it('keeps an explicit language choice', () => {
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, language: 'fa' }).language).toBe('fa')
  })

  it('repairs only the invalid fields and keeps the valid ones', () => {
    const stored = {
      ...DEFAULT_PREFERENCES,
      currency: 'EUR',
      accountSize: 5000,
      riskPercent: 2,
      leverage: 0,
      maintenanceMarginPercent: 0.4,
      defaultTimeRange: '90d' as const,
      language: 'fa' as const,
    }

    expect(parsePreferences(stored)).toEqual({
      ...stored,
      leverage: DEFAULT_PREFERENCES.leverage,
    })
  })

  it('repairs an invalid account size without resetting the other fields', () => {
    const parsed = parsePreferences({ ...DEFAULT_PREFERENCES, currency: 'EUR', accountSize: -1 })

    expect(parsed.accountSize).toBe(DEFAULT_PREFERENCES.accountSize)
    expect(parsed.currency).toBe('EUR')
  })

  it('accepts a zero account size to match the input minimum', () => {
    expect(parsePreferences({ ...DEFAULT_PREFERENCES, accountSize: 0 }).accountSize).toBe(0)
  })

  it('keeps explicit market, auto-close and background choices', () => {
    const parsed = parsePreferences({
      ...DEFAULT_PREFERENCES,
      priceProvider: 'coingecko',
      autoCloseByDefault: true,
      notificationsEnabled: true,
      backgroundMonitoring: true,
      windowsCloseBehavior: 'tray',
    })

    expect(parsed.priceProvider).toBe('coingecko')
    expect(parsed.autoCloseByDefault).toBe(true)
    expect(parsed.notificationsEnabled).toBe(true)
    expect(parsed.backgroundMonitoring).toBe(true)
    expect(parsed.windowsCloseBehavior).toBe('tray')
  })

  it('repairs an invalid provider and close behavior without resetting other fields', () => {
    const parsed = parsePreferences({
      ...DEFAULT_PREFERENCES,
      currency: 'EUR',
      priceProvider: 'kraken',
      windowsCloseBehavior: 'ask-every-time',
    })

    expect(parsed.priceProvider).toBe('auto')
    expect(parsed.windowsCloseBehavior).toBe('unset')
    expect(parsed.currency).toBe('EUR')
  })
})
