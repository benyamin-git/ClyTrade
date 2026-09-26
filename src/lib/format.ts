import { currencyDef } from './currency'
import { getIntlContext } from './intl'

const numberFormatters = new Map<string, Intl.NumberFormat>()

function numberFormatter(key: string, build: () => Intl.NumberFormat): Intl.NumberFormat {
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = build()
    numberFormatters.set(key, formatter)
  }
  return formatter
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  if (!Number.isFinite(value)) return '—'
  const { locale } = getIntlContext()
  const key = options ? `${locale}|${JSON.stringify(options)}` : `${locale}|default`
  return numberFormatter(
    key,
    () => new Intl.NumberFormat(locale, options ?? { maximumFractionDigits: 8 }),
  ).format(value)
}

export function formatCurrency(
  value: number,
  currency = 'USD',
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return '—'
  const def = currencyDef(currency)
  if (def?.customSymbol) {
    return `${formatNumber(value, { maximumFractionDigits: 2, ...options })} ${def.symbol}`
  }
  const { locale } = getIntlContext()
  const key = `${locale}|currency|${currency.toUpperCase()}|${options ? JSON.stringify(options) : ''}`
  return numberFormatter(
    key,
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
        ...options,
      }),
  ).format(value)
}

export function formatPercent(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return `${formatNumber(value, { maximumFractionDigits })}%`
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const { locale } = getIntlContext()
  return numberFormatter(
    `${locale}|compact`,
    () => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }),
  ).format(value)
}

export function formatPrice(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return '—'
  const resolved = decimals ?? (Math.abs(value) >= 1000 ? 2 : Math.abs(value) >= 1 ? 4 : 8)
  return formatNumber(value, { maximumFractionDigits: resolved })
}

function toAsciiDigits(input: string): string {
  let result = ''
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0
    if (code >= 0x06f0 && code <= 0x06f9) {
      result += String(code - 0x06f0)
    } else if (code >= 0x0660 && code <= 0x0669) {
      result += String(code - 0x0660)
    } else {
      result += char
    }
  }
  return result
}

export function parseNumberInput(raw: string): number | null {
  const normalized = toAsciiDigits(raw.trim())
    .replace(/٫/g, '.')
    .replace(/[\s,٬،]/g, '')
    .replace(/[%٪]$/, '')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
