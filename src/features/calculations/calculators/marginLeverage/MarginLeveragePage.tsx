import { useMemo, useState } from 'react'
import { calculateMarginLeverage } from '@/calculations/marginLeverage'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function MarginLeverageCalculator() {
  const { preferences } = usePreferences()
  const [accountSize, setAccountSize] = useState<number | null>(preferences.accountSize)
  const [positionNotional, setPositionNotional] = useState<number | null>(null)
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [maintenanceMarginPercent, setMaintenanceMarginPercent] = useState<number | null>(
    preferences.maintenanceMarginPercent,
  )

  const result = useMemo(() => {
    if (
      accountSize === null ||
      positionNotional === null ||
      leverage === null ||
      maintenanceMarginPercent === null
    ) {
      return null
    }
    return calculateMarginLeverage({
      accountSize,
      positionNotional,
      leverage,
      maintenanceMarginPercent,
    })
  }, [accountSize, positionNotional, leverage, maintenanceMarginPercent])

  const overBudget = result !== null && result.marginPercentOfAccount > 100

  return (
    <CalculatorLayout
      title="Margin & Leverage"
      subtitle="What a position costs to open, and how leveraged you really are"
      docSlug="calculator-margin-leverage"
      notices={overBudget ? ['Required margin exceeds the account size.'] : []}
      inputs={
        <>
          <NumberField
            label="Account size"
            unit={currencySymbol(preferences.currency)}
            value={accountSize}
            onChange={setAccountSize}
            min={0}
          />
          <NumberField
            label="Position notional"
            unit={currencySymbol(preferences.currency)}
            value={positionNotional}
            onChange={setPositionNotional}
            min={0}
          />
          <NumberField label="Leverage" unit="×" value={leverage} onChange={setLeverage} min={1} />
          <NumberField
            label="Maintenance margin"
            unit="%"
            value={maintenanceMarginPercent}
            onChange={setMaintenanceMarginPercent}
            min={0}
          />
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label="Required margin"
              value={formatCurrency(result.requiredMargin, preferences.currency)}
              tone="primary"
              size="lg"
            />
            <Stat
              label="Margin of account"
              value={`${formatNumber(result.marginPercentOfAccount, { maximumFractionDigits: 1 })}%`}
              tone={overBudget ? 'loss' : 'default'}
            />
            <Stat
              label="Max notional"
              value={formatCurrency(result.maxPositionNotional, preferences.currency)}
              hint={`at ${formatNumber(leverage ?? 0, { maximumFractionDigits: 2 })}×`}
            />
            <Stat
              label="Effective leverage"
              value={`${formatNumber(result.effectiveLeverage, { maximumFractionDigits: 2 })}×`}
            />
            <Stat
              label="Liquidation move"
              value={`${formatNumber(result.liquidationMovePercent, { maximumFractionDigits: 2 })}%`}
              hint="adverse move that consumes margin"
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Enter the position notional to see results.
          </p>
        )
      }
    />
  )
}

export function MarginLeveragePage() {
  return (
    <PreferencesGate>
      <MarginLeverageCalculator />
    </PreferencesGate>
  )
}
