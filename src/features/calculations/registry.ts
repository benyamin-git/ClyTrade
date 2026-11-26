import type { ComponentType } from 'react'
import type { TranslationKey } from '@/i18n/types'
import { CalculatorPage } from './pages/CalculatorPage'

export interface CalculatorPageProps {
  docSlug: string
}

export interface CalculatorDef {
  id: string
  labelKey: TranslationKey
  path: string
  docSlug: string
  Page: ComponentType<CalculatorPageProps>
}

export const calculators: readonly CalculatorDef[] = [
  {
    id: 'overview',
    labelKey: 'nav.overview',
    path: '/calculations/overview',
    docSlug: 'calculator-overview',
    Page: CalculatorPage,
  },
]

export const DEFAULT_CALCULATOR_PATH = calculators[0]?.path ?? '/calculations'
