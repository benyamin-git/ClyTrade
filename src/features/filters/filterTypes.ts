import type { TranslationKey } from '@/i18n/types'

export type TriState = 'any' | 'has' | 'missing'

export interface Range {
  min: number | null
  max: number | null
}

export interface FilterGroupDescriptor<F> {
  id: string
  labelKey: TranslationKey
  isActive: (filters: F) => boolean
  clear: (filters: F) => F
}

export interface FilterChipDescriptor<F> {
  id: string
  label: string
  clear: (filters: F) => F
}
