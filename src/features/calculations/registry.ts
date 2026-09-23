import type { ComponentType } from 'react'
import { PositionSizePage } from './calculators/positionSize/PositionSizePage'
import { MarginLeveragePage } from './calculators/marginLeverage/MarginLeveragePage'
import { LiquidationPricePage } from './calculators/liquidationPrice/LiquidationPricePage'
import { RiskRewardPage } from './calculators/riskReward/RiskRewardPage'
import { FeesPnlPage } from './calculators/feesPnl/FeesPnlPage'
import { AverageEntryPage } from './calculators/averageEntry/AverageEntryPage'
import { SpotFuturesPage } from './calculators/spotFutures/SpotFuturesPage'

export interface CalculatorDef {
  id: string
  label: string
  path: string
  docSlug: string
  Page: ComponentType
}

export const calculators: readonly CalculatorDef[] = [
  {
    id: 'position-size',
    label: 'Position Size',
    path: '/calculations/position-size',
    docSlug: 'calculator-position-size',
    Page: PositionSizePage,
  },
  {
    id: 'margin-leverage',
    label: 'Margin & Leverage',
    path: '/calculations/margin-leverage',
    docSlug: 'calculator-margin-leverage',
    Page: MarginLeveragePage,
  },
  {
    id: 'liquidation-price',
    label: 'Liquidation Price',
    path: '/calculations/liquidation-price',
    docSlug: 'calculator-liquidation-price',
    Page: LiquidationPricePage,
  },
  {
    id: 'risk-reward',
    label: 'Risk / Reward',
    path: '/calculations/risk-reward',
    docSlug: 'calculator-risk-reward',
    Page: RiskRewardPage,
  },
  {
    id: 'fees-pnl',
    label: 'Fees & PnL',
    path: '/calculations/fees-pnl',
    docSlug: 'calculator-fees-pnl',
    Page: FeesPnlPage,
  },
  {
    id: 'average-entry',
    label: 'Average Entry / DCA',
    path: '/calculations/average-entry',
    docSlug: 'calculator-average-entry',
    Page: AverageEntryPage,
  },
  {
    id: 'spot-futures',
    label: 'Spot ↔ Futures',
    path: '/calculations/spot-futures',
    docSlug: 'calculator-spot-futures',
    Page: SpotFuturesPage,
  },
]

export const DEFAULT_CALCULATOR_PATH = calculators[0]?.path ?? '/calculations'
