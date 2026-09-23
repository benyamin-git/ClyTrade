import type { ComponentType } from 'react'

export type TabId = 'journal' | 'portfolio' | 'calculations' | 'settings'

export interface SubTabDef {
  id: string
  label: string
  path: string
  element: ComponentType
}

export interface TabDef {
  id: TabId
  label: string
  path: string
  icon: ComponentType<{ className?: string }>
  subtabs: readonly SubTabDef[]
}
