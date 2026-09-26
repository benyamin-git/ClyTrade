import type { ComponentType } from 'react'
import type { TranslationKey } from '@/i18n/types'
import { PositionSizePage } from './calculators/positionSize/PositionSizePage'
import { MarginLeveragePage } from './calculators/marginLeverage/MarginLeveragePage'
import { LiquidationPricePage } from './calculators/liquidationPrice/LiquidationPricePage'
import { RiskRewardPage } from './calculators/riskReward/RiskRewardPage'
import { FeesPnlPage } from './calculators/feesPnl/FeesPnlPage'
import { AverageEntryPage } from './calculators/averageEntry/AverageEntryPage'
import { SpotFuturesPage } from './calculators/spotFutures/SpotFuturesPage'

export interface CalculatorDef {
  id: string
  labelKey: TranslationKey
  path: string
  docSlug: string
  Page: ComponentType
}

export const calculators: readonly CalculatorDef[] = [
  {
    id: 'position-size',
    labelKey: 'calc.positionSize.title',
    path: '/calculations/position-size',
    docSlug: 'calculator-position-size',
    Page: PositionSizePage,
  },
  {
    id: 'margin-leverage',
    labelKey: 'calc.marginLeverage.title',
    path: '/calculations/margin-leverage',
    docSlug: 'calculator-margin-leverage',
    Page: MarginLeveragePage,
  },
  {
    id: 'liquidation-price',
    labelKey: 'calc.liquidationPrice.title',
    path: '/calculations/liquidation-price',
    docSlug: 'calculator-liquidation-price',
    Page: LiquidationPricePage,
  },
  {
    id: 'risk-reward',
    labelKey: 'calc.riskReward.title',
    path: '/calculations/risk-reward',
    docSlug: 'calculator-risk-reward',
    Page: RiskRewardPage,
  },
  {
    id: 'fees-pnl',
    labelKey: 'calc.feesPnl.title',
    path: '/calculations/fees-pnl',
    docSlug: 'calculator-fees-pnl',
    Page: FeesPnlPage,
  },
  {
    id: 'average-entry',
    labelKey: 'calc.averageEntry.title',
    path: '/calculations/average-entry',
    docSlug: 'calculator-average-entry',
    Page: AverageEntryPage,
  },
  {
    id: 'spot-futures',
    labelKey: 'calc.spotFutures.title',
    path: '/calculations/spot-futures',
    docSlug: 'calculator-spot-futures',
    Page: SpotFuturesPage,
  },
]

export const DEFAULT_CALCULATOR_PATH = calculators[0]?.path ?? '/calculations'
