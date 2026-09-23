import { useMemo, useState } from 'react'
import { calculatePositionSize } from '@/calculations/positionSize'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { formatCurrency, formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function PositionSizeCalculator() {
  const { preferences } = usePreferences()
  const [accountSize, setAccountSize] = useState<number | null>(preferences.accountSize)
  const [riskPercent, setRiskPercent] = useState<number | null>(preferences.riskPercent)
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [stopPrice, setStopPrice] = useState<number | null>(null)
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [feePercent, setFeePercent] = useState<number | null>(preferences.feePercent)

  const result = useMemo(() => {
    if (
      accountSize === null ||
      riskPercent === null ||
      entryPrice === null ||
      stopPrice === null ||
      leverage === null ||
      feePercent === null
    ) {
      return null
    }
    return calculatePositionSize({
      accountSize,
      riskPercent,
      entryPrice,
      stopPrice,
      leverage,
      feePercent,
    })
  }, [accountSize, riskPercent, entryPrice, stopPrice, leverage, feePercent])

  const notices =
    entryPrice !== null && stopPrice !== null && entryPrice === stopPrice
      ? ['Entry and stop must differ.']
      : []

  return (
    <CalculatorLayout
      title="Position Size"
      subtitle="Risk-first sizing from your stop distance"
      docSlug="calculator-position-size"
      notices={notices}
      inputs={
        <>
          <NumberField
            label="Account size"
            unit={preferences.currency}
            value={accountSize}
            onChange={setAccountSize}
            min={0}
          />
          <NumberField
            label="Risk"
            unit="%"
            value={riskPercent}
            onChange={setRiskPercent}
            min={0}
            max={100}
          />
          <NumberField label="Entry price" value={entryPrice} onChange={setEntryPrice} min={0} />
          <NumberField label="Stop price" value={stopPrice} onChange={setStopPrice} min={0} />
          <NumberField label="Leverage" unit="×" value={leverage} onChange={setLeverage} min={1} />
          <NumberField
            label="Fee per side"
            unit="%"
            value={feePercent}
            onChange={setFeePercent}
            min={0}
          />
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label="Position size"
              value={formatNumber(result.positionSize, { maximumFractionDigits: 6 })}
              hint="units"
              tone="primary"
              size="lg"
            />
            <Stat
              label="Risk amount"
              value={formatCurrency(result.riskAmount, preferences.currency)}
            />
            <Stat
              label="Stop distance"
              value={`${formatPrice(result.stopDistance)} · ${formatNumber(result.stopDistancePercent, { maximumFractionDigits: 2 })}%`}
            />
            <Stat
              label="Notional"
              value={formatCurrency(result.positionNotional, preferences.currency)}
            />
            <Stat
              label="Required margin"
              value={formatCurrency(result.requiredMargin, preferences.currency)}
              hint={`${formatNumber(result.marginPercentOfAccount, { maximumFractionDigits: 1 })}% of account`}
            />
            <Stat
              label="Fees (round trip)"
              value={formatCurrency(result.feeEstimate, preferences.currency)}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Fill in entry and stop prices to see results.
          </p>
        )
      }
    />
  )
}

export function PositionSizePage() {
  return (
    <PreferencesGate>
      <PositionSizeCalculator />
    </PreferencesGate>
  )
}
