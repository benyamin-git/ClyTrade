import { getIntlContext } from './intl'

export type TimeRange = '7d' | '30d' | '90d' | 'ytd' | 'all'

export const TIME_RANGES: readonly TimeRange[] = ['7d', '30d', '90d', 'ytd', 'all']

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function rangeStart(range: TimeRange, now = new Date()): Date | null {
  switch (range) {
    case '7d':
      return startOfDay(addDays(now, -7))
    case '30d':
      return startOfDay(addDays(now, -30))
    case '90d':
      return startOfDay(addDays(now, -90))
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1)
    case 'all':
      return null
  }
}

export function isWithinRange(timestamp: number, range: TimeRange, now = new Date()): boolean {
  const start = rangeStart(range, now)
  return start === null || timestamp >= start.getTime()
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>()

export function formatDate(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  if (Number.isNaN(date.getTime())) return '—'
  const { locale, calendar } = getIntlContext()
  const key = `${locale}|${calendar ?? ''}`
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', calendar })
    dateFormatters.set(key, formatter)
  }
  return formatter.format(date)
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}
