const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 })
const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 2,
})

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  if (!Number.isFinite(value)) return '—'
  if (options) return new Intl.NumberFormat(undefined, options).format(value)
  return numberFormatter.format(value)
}

export function formatCurrency(
  value: number,
  currency = 'USD',
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function formatPercent(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return `${formatNumber(value, { maximumFractionDigits })}%`
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return compactFormatter.format(value)
}

export function formatPrice(value: number, decimals?: number): string {
  if (!Number.isFinite(value)) return '—'
  const resolved = decimals ?? (Math.abs(value) >= 1000 ? 2 : Math.abs(value) >= 1 ? 4 : 8)
  return formatNumber(value, { maximumFractionDigits: resolved })
}

export function parseNumberInput(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '').replace(/%$/, '')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
