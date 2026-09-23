/**
 * Shared types for the pure calculation layer.
 *
 * Rules for this directory (see README.md):
 * - Pure functions only: no React, no DOM, no database, no network.
 * - Never throw on invalid input; return `null` instead.
 * - Every module has a colocated `*.test.ts` with table-driven cases.
 */

export type Direction = 'long' | 'short'

export function isFiniteInputs(values: readonly number[]): boolean {
  return values.every((value) => Number.isFinite(value))
}
