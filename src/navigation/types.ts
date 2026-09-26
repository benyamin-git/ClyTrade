import type { ComponentType } from 'react'
import type { TranslationKey } from '@/i18n/types'

export type TabId = 'journal' | 'portfolio' | 'calculations' | 'settings'

export interface SubTabDef {
  id: string
  labelKey: TranslationKey
  path: string
  element: ComponentType
}

export interface TabDef {
  id: TabId
  labelKey: TranslationKey
  path: string
  icon: ComponentType<{ className?: string }>
  subtabs: readonly SubTabDef[]
}
