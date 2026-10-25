import type {
  AlertPercentDirection,
  AlertPriceMode,
  AlertRepeat,
  PriceAlertDraft,
} from '@/data/models/price'
import type { SymbolCandidate } from '@/market/symbols'

export interface AlertFormValues {
  kind: 'price' | 'percent'
  symbol: string
  candidate: SymbolCandidate | null
  priceMode: AlertPriceMode | null
  level: number | null
  rangeLow: number | null
  rangeHigh: number | null
  percent: number | null
  percentDirection: AlertPercentDirection | null
  repeat: AlertRepeat
  cooldownMinutes: number
  note: string
  referencePrice: number | null
}

const COOLDOWN_MIN = 15
const COOLDOWN_MAX = 1440
const PERCENT_MAX = 1000

export const DEFAULT_COOLDOWN_MINUTES = 60

function isPositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0
}

export function validateAlertForm(values: AlertFormValues): string | null {
  if (values.symbol.trim() === '' || values.candidate === null) {
    return 'alerts.form.validation.symbolRequired'
  }

  if (values.repeat === 'cooldown') {
    if (
      !Number.isInteger(values.cooldownMinutes) ||
      values.cooldownMinutes < COOLDOWN_MIN ||
      values.cooldownMinutes > COOLDOWN_MAX
    ) {
      return 'alerts.form.validation.cooldownRange'
    }
  }

  if (values.kind === 'price') {
    if (values.priceMode === null) {
      return 'alerts.form.validation.priceModeRequired'
    }
    if (values.priceMode === 'range') {
      if (!isPositive(values.rangeLow) || !isPositive(values.rangeHigh)) {
        return 'alerts.form.validation.rangePositive'
      }
      if (values.rangeLow >= values.rangeHigh) {
        return 'alerts.form.validation.rangeOrder'
      }
      return null
    }
    if (!isPositive(values.level)) {
      return 'alerts.form.validation.levelPositive'
    }
    return null
  }

  if (!isPositive(values.percent)) {
    return 'alerts.form.validation.percentPositive'
  }
  if (values.percent > PERCENT_MAX) {
    return 'alerts.form.validation.percentTooLarge'
  }
  if (values.percentDirection === null) {
    return 'alerts.form.validation.percentDirectionRequired'
  }
  if (!isPositive(values.referencePrice)) {
    return 'alerts.form.validation.referenceUnavailable'
  }
  return null
}

export function toAlertDraft(values: AlertFormValues, now: number): PriceAlertDraft {
  void now
  const isPercent = values.kind === 'percent'
  const isRange = !isPercent && values.priceMode === 'range'
  const note = values.note.trim()

  return {
    kind: values.kind,
    symbol: values.symbol.trim().toUpperCase(),
    binanceSymbol: values.candidate?.binanceSymbol ?? null,
    coingeckoId: values.candidate?.coingeckoId ?? null,
    priceMode: isPercent ? null : values.priceMode,
    level: isPercent || isRange ? null : values.level,
    rangeLow: isRange ? values.rangeLow : null,
    rangeHigh: isRange ? values.rangeHigh : null,
    percent: isPercent ? values.percent : null,
    percentDirection: isPercent ? values.percentDirection : null,
    repeat: values.repeat,
    cooldownMinutes:
      values.repeat === 'cooldown' ? values.cooldownMinutes : DEFAULT_COOLDOWN_MINUTES,
    referencePrice: isPercent ? values.referencePrice : null,
    lastPrice: null,
    armed: true,
    enabled: true,
    note: note === '' ? null : note,
    lastFiredAt: null,
  }
}
