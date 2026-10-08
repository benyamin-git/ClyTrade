import { currencyDef } from './currency'
import { getIntlContext } from './intl'

const numberFormatters = new Map<string, Intl.NumberFormat>()

export function resetFormatCaches(): void {
  numberFormatters.clear()
}

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
        ...options,
      }),
  ).format(value)
}

export function formatPercent(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  const { locale } = getIntlContext()
  const key = `${locale}|percent|${maximumFractionDigits}`
  return numberFormatter(
    key,
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits }),
  ).format(value / 100)
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

const GROUPING = /[,٬\s،]/

function normalizeGroupedNumber(value: string): string | null {
  const sign = value.startsWith('-') || value.startsWith('+') ? value.slice(0, 1) : ''
  const unsigned = sign === '' ? value : value.slice(1)
  const dot = unsigned.indexOf('.')
  const integerPart = dot === -1 ? unsigned : unsigned.slice(0, dot)
  const fractionPart = dot === -1 ? null : unsigned.slice(dot + 1)
  const groups = integerPart.split(GROUPING)
  if (groups.length === 1) {
    if (!/^\d*$/.test(integerPart)) return null
  } else {
    const [first, ...rest] = groups
    if (first === undefined || !/^\d{1,3}$/.test(first)) return null
    if (!rest.every((group) => /^\d{3}$/.test(group))) return null
  }
  if (fractionPart !== null && !/^\d*$/.test(fractionPart)) return null
  const digits = groups.join('')
  if (digits === '' && !fractionPart) return null
  return `${sign}${digits}${fractionPart === null ? '' : `.${fractionPart}`}`
}

export function parseNumberInput(raw: string): number | null {
  const normalized = toAsciiDigits(raw.trim()).replace(/[%٪]$/, '').replace(/٫/g, '.')
  if (normalized === '') return null
  const candidate = GROUPING.test(normalized) ? normalizeGroupedNumber(normalized) : normalized
  if (candidate === null) return null
  const parsed = Number(candidate)
  return Number.isFinite(parsed) ? parsed : null
}
