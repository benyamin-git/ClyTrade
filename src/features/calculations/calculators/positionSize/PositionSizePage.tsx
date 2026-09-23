import { useMemo, useState } from 'react'
import { calculatePositionSize } from '@/calculations/positionSize'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber, formatPrice } from '@/lib/format'
import { NumberField, type NumberUnitOption } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'
import { convertUnit, toPercent, type UnitMode } from '../../logic/units'

function PositionSizeCalculator() {
  const { preferences } = usePreferences()
  const [accountSize, setAccountSize] = useState<number | null>(preferences.accountSize)
  const [risk, setRisk] = useState<number | null>(preferences.riskPercent)
  const [riskUnit, setRiskUnit] = useState<UnitMode>('percent')
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [stopPrice, setStopPrice] = useState<number | null>(null)
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [fee, setFee] = useState<number | null>(preferences.feePercent)
  const [feeUnit, setFeeUnit] = useState<UnitMode>('percent')

  const unitOptions: readonly NumberUnitOption[] = [
    { value: 'percent', label: '%' },
    { value: 'currency', label: currencySymbol(preferences.currency) },
  ]

  const result = useMemo(() => {
    if (
      accountSize === null ||
      risk === null ||
      entryPrice === null ||
      stopPrice === null ||
      leverage === null ||
      fee === null
    ) {
      return null
    }
    const riskPercent = riskUnit === 'percent' ? risk : toPercent(risk, accountSize)
    if (riskPercent === null) return null
    return calculatePositionSize({
      accountSize,
      riskPercent,
      entryPrice,
      stopPrice,
      leverage,
      feePercent: feeUnit === 'percent' ? fee : null,
      feeAmount: feeUnit === 'currency' ? fee : null,
      includeFees: preferences.feesInRisk,
    })
  }, [
    accountSize,
    risk,
    riskUnit,
    entryPrice,
    stopPrice,
    leverage,
    fee,
    feeUnit,
    preferences.feesInRisk,
  ])

  function switchRiskUnit(next: string) {
    const mode = next as UnitMode
    if (mode === riskUnit) return
    setRisk(convertUnit(risk, riskUnit, mode, accountSize))
    setRiskUnit(mode)
  }

  function switchFeeUnit(next: string) {
    const mode = next as UnitMode
    if (mode === feeUnit) return
    setFee(convertUnit(fee, feeUnit, mode, result?.positionNotional ?? null))
    setFeeUnit(mode)
  }

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
            unit={currencySymbol(preferences.currency)}
            value={accountSize}
            onChange={setAccountSize}
            min={0}
          />
          <NumberField
            label="Risk"
            value={risk}
            onChange={setRisk}
            unitOptions={unitOptions}
            unitValue={riskUnit}
            onUnitChange={switchRiskUnit}
            min={0}
            max={riskUnit === 'percent' ? 100 : undefined}
            hint={riskUnit === 'currency' ? 'Absolute risk budget' : undefined}
          />
          <NumberField label="Entry price" value={entryPrice} onChange={setEntryPrice} min={0} />
          <NumberField label="Stop price" value={stopPrice} onChange={setStopPrice} min={0} />
          <NumberField label="Leverage" unit="×" value={leverage} onChange={setLeverage} min={1} />
          <NumberField
            label="Fee per side"
            value={fee}
            onChange={setFee}
            unitOptions={unitOptions}
            unitValue={feeUnit}
            onUnitChange={switchFeeUnit}
            min={0}
            hint={feeUnit === 'currency' ? 'Absolute cost per side' : undefined}
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
              hint={preferences.feesInRisk ? 'stop loss + fees' : 'stop loss only'}
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
