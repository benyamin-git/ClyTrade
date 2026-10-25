import { describe, expect, it } from 'vitest'
import type { AlertPercentDirection, AlertPriceMode, AlertRepeat } from '@/data/models/price'
import type { SymbolCandidate } from '@/market/symbols'
import { toAlertDraft, validateAlertForm, type AlertFormValues } from './alertForm'

const NOW = 1_700_000_000_000

function candidate(overrides: Partial<SymbolCandidate> = {}): SymbolCandidate {
  return {
    provider: 'binance',
    priceId: 'BTCUSDT',
    symbol: 'BTCUSDT',
    name: null,
    quote: 'USDT',
    rank: null,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    ...overrides,
  }
}

function values(overrides: Partial<AlertFormValues> = {}): AlertFormValues {
  return {
    kind: 'price',
    symbol: 'btc',
    candidate: candidate(),
    priceMode: 'above',
    level: 68000,
    rangeLow: null,
    rangeHigh: null,
    percent: null,
    percentDirection: null,
    repeat: 'once',
    cooldownMinutes: 60,
    note: '',
    referencePrice: null,
    ...overrides,
  }
}

const priceModes: readonly AlertPriceMode[] = ['above', 'below', 'crossing', 'range']
const percentDirections: readonly AlertPercentDirection[] = ['up', 'down', 'both']
const repeats: readonly AlertRepeat[] = ['once', 'cross-back', 'cooldown']

describe('validateAlertForm', () => {
  it('accepts every price mode', () => {
    for (const priceMode of priceModes) {
      const result = validateAlertForm(
        values(
          priceMode === 'range'
            ? { priceMode, level: null, rangeLow: 60000, rangeHigh: 70000 }
            : { priceMode },
        ),
      )
      expect(result, priceMode).toBeNull()
    }
  })

  it('accepts every percent direction when a reference price exists', () => {
    for (const percentDirection of percentDirections) {
      const result = validateAlertForm(
        values({
          kind: 'percent',
          priceMode: null,
          level: null,
          percent: 5,
          percentDirection,
          referencePrice: 68000,
        }),
      )
      expect(result, percentDirection).toBeNull()
    }
  })

  it('accepts every repeat mode with a cooldown inside the bounds', () => {
    for (const repeat of repeats) {
      for (const cooldownMinutes of [15, 60, 1440]) {
        const result = validateAlertForm(values({ repeat, cooldownMinutes }))
        expect(result, `${repeat} ${cooldownMinutes}`).toBeNull()
      }
    }
  })

  it('rejects an empty symbol or a missing candidate', () => {
    expect(validateAlertForm(values({ symbol: '' }))).toBe('alerts.form.validation.symbolRequired')
    expect(validateAlertForm(values({ symbol: '   ' }))).toBe(
      'alerts.form.validation.symbolRequired',
    )
    expect(validateAlertForm(values({ candidate: null }))).toBe(
      'alerts.form.validation.symbolRequired',
    )
  })

  it('rejects a missing price mode or percent direction', () => {
    expect(validateAlertForm(values({ priceMode: null }))).toBe(
      'alerts.form.validation.priceModeRequired',
    )
    expect(
      validateAlertForm(
        values({
          kind: 'percent',
          priceMode: null,
          level: null,
          percent: 5,
          percentDirection: null,
          referencePrice: 68000,
        }),
      ),
    ).toBe('alerts.form.validation.percentDirectionRequired')
  })

  it('rejects a non-positive level', () => {
    for (const level of [null, 0, -1]) {
      expect(validateAlertForm(values({ level })), String(level)).toBe(
        'alerts.form.validation.levelPositive',
      )
    }
  })

  it('rejects non-positive range bounds and a range that is not ordered', () => {
    expect(
      validateAlertForm(values({ priceMode: 'range', level: null, rangeLow: null, rangeHigh: 1 })),
    ).toBe('alerts.form.validation.rangePositive')
    expect(
      validateAlertForm(values({ priceMode: 'range', level: null, rangeLow: 1, rangeHigh: 0 })),
    ).toBe('alerts.form.validation.rangePositive')
    expect(
      validateAlertForm(
        values({ priceMode: 'range', level: null, rangeLow: 70000, rangeHigh: 70000 }),
      ),
    ).toBe('alerts.form.validation.rangeOrder')
    expect(
      validateAlertForm(
        values({ priceMode: 'range', level: null, rangeLow: 70000, rangeHigh: 60000 }),
      ),
    ).toBe('alerts.form.validation.rangeOrder')
  })

  it('rejects a non-positive percent and a percent over 1000', () => {
    for (const percent of [null, 0, -1]) {
      expect(
        validateAlertForm(
          values({
            kind: 'percent',
            priceMode: null,
            level: null,
            percent,
            percentDirection: 'up',
            referencePrice: 68000,
          }),
        ),
        String(percent),
      ).toBe('alerts.form.validation.percentPositive')
    }

    expect(
      validateAlertForm(
        values({
          kind: 'percent',
          priceMode: null,
          level: null,
          percent: 1001,
          percentDirection: 'up',
          referencePrice: 68000,
        }),
      ),
    ).toBe('alerts.form.validation.percentTooLarge')
    expect(
      validateAlertForm(
        values({
          kind: 'percent',
          priceMode: null,
          level: null,
          percent: 1000,
          percentDirection: 'up',
          referencePrice: 68000,
        }),
      ),
    ).toBeNull()
  })

  it('rejects a cooldown outside 15 to 1440 minutes', () => {
    for (const cooldownMinutes of [14, 1441, 15.5]) {
      expect(validateAlertForm(values({ cooldownMinutes })), String(cooldownMinutes)).toBe(
        'alerts.form.validation.cooldownRange',
      )
    }
  })

  it('requires a positive reference price for percent rules only', () => {
    for (const referencePrice of [null, 0, -1]) {
      expect(
        validateAlertForm(
          values({
            kind: 'percent',
            priceMode: null,
            level: null,
            percent: 5,
            percentDirection: 'up',
            referencePrice,
          }),
        ),
        String(referencePrice),
      ).toBe('alerts.form.validation.referenceUnavailable')
    }

    expect(
      validateAlertForm(
        values({
          kind: 'price',
          referencePrice: null,
        }),
      ),
    ).toBeNull()
  })
})

describe('toAlertDraft', () => {
  it('builds a price rule with provider ids and fresh alert state', () => {
    const draft = toAlertDraft(values({ note: '  watch the breakout  ' }), NOW)

    expect(draft).toEqual({
      kind: 'price',
      symbol: 'BTC',
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
      priceMode: 'above',
      level: 68000,
      rangeLow: null,
      rangeHigh: null,
      percent: null,
      percentDirection: null,
      repeat: 'once',
      cooldownMinutes: 60,
      referencePrice: null,
      lastPrice: null,
      armed: true,
      enabled: true,
      note: 'watch the breakout',
      lastFiredAt: null,
    })
  })

  it('builds every price mode and clears the unused level fields', () => {
    for (const priceMode of priceModes) {
      const draft = toAlertDraft(
        values(
          priceMode === 'range'
            ? { priceMode, level: null, rangeLow: 60000, rangeHigh: 70000 }
            : { priceMode, rangeLow: 60000, rangeHigh: 70000 },
        ),
        NOW,
      )

      expect(draft.priceMode, priceMode).toBe(priceMode)
      expect(draft.percent, priceMode).toBeNull()
      expect(draft.percentDirection, priceMode).toBeNull()
      expect(draft.referencePrice, priceMode).toBeNull()
      if (priceMode === 'range') {
        expect(draft.level).toBeNull()
        expect(draft.rangeLow).toBe(60000)
        expect(draft.rangeHigh).toBe(70000)
      } else {
        expect(draft.level).toBe(68000)
        expect(draft.rangeLow).toBeNull()
        expect(draft.rangeHigh).toBeNull()
      }
    }
  })

  it('builds every percent direction with the reference price', () => {
    for (const percentDirection of percentDirections) {
      const draft = toAlertDraft(
        values({
          kind: 'percent',
          priceMode: null,
          level: 68000,
          rangeLow: 1,
          rangeHigh: 2,
          percent: 5,
          percentDirection,
          referencePrice: 68000,
        }),
        NOW,
      )

      expect(draft.kind, percentDirection).toBe('percent')
      expect(draft.priceMode, percentDirection).toBeNull()
      expect(draft.level, percentDirection).toBeNull()
      expect(draft.rangeLow, percentDirection).toBeNull()
      expect(draft.rangeHigh, percentDirection).toBeNull()
      expect(draft.percent, percentDirection).toBe(5)
      expect(draft.percentDirection, percentDirection).toBe(percentDirection)
      expect(draft.referencePrice, percentDirection).toBe(68000)
    }
  })

  it('keeps repeat and cooldown values', () => {
    for (const repeat of repeats) {
      const draft = toAlertDraft(values({ repeat, cooldownMinutes: 90 }), NOW)
      expect(draft.repeat, repeat).toBe(repeat)
      expect(draft.cooldownMinutes, repeat).toBe(90)
    }
  })

  it('stores an empty note as null and trims a non-empty note', () => {
    expect(toAlertDraft(values({ note: '   ' }), NOW).note).toBeNull()
    expect(toAlertDraft(values({ note: ' hello ' }), NOW).note).toBe('hello')
  })

  it('normalizes the symbol and keeps a missing mapping nullable', () => {
    const draft = toAlertDraft(
      values({
        symbol: '  btc ',
        candidate: candidate({ binanceSymbol: null, coingeckoId: null }),
      }),
      NOW,
    )
    expect(draft.symbol).toBe('BTC')
    expect(draft.binanceSymbol).toBeNull()
    expect(draft.coingeckoId).toBeNull()
  })
})
