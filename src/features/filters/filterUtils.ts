import type { FilterGroupDescriptor, Range, TriState } from './filterTypes'

export const EMPTY_RANGE: Range = { min: null, max: null }

export function isRangeActive(range: Range): boolean {
  return range.min !== null || range.max !== null
}

export function inRange(value: number, range: Range): boolean {
  if (range.min !== null && value < range.min) return false
  if (range.max !== null && value > range.max) return false
  return true
}

export function matchesText(
  values: readonly (string | null | undefined)[],
  needle: string,
): boolean {
  const query = needle.trim().toLowerCase()
  if (query === '') return true
  return values.some(
    (value) => value !== null && value !== undefined && value.toLowerCase().includes(query),
  )
}

export function matchesTriState(present: boolean, state: TriState): boolean {
  if (state === 'any') return true
  return state === 'has' ? present : !present
}

export function toggleInArray<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function withRangeBound(range: Range, bound: 'min' | 'max', value: number | null): Range {
  return { ...range, [bound]: value }
}

export function countRange(range: Range): number {
  return (range.min !== null ? 1 : 0) + (range.max !== null ? 1 : 0)
}

export function countTriState(state: TriState): number {
  return state === 'any' ? 0 : 1
}

export function sectionCount<F>(
  id: string,
  counters: Readonly<Record<string, (filters: F) => number>>,
  filters: F,
): number {
  return counters[id]?.(filters) ?? 0
}

export function activeGroupCount<F>(
  filters: F,
  groups: readonly FilterGroupDescriptor<F>[],
): number {
  return groups.filter((group) => group.isActive(filters)).length
}
