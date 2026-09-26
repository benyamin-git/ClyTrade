import { useMemo, useState } from 'react'
import { calculatePositionSize } from '@/calculations/positionSize'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber, formatPrice } from '@/lib/format'
import { NumberField, type NumberUnitOption } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'
import { convertUnit, toPercent, type UnitMode } from '../../logic/units'

function PositionSizeCalculator() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
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
      ? [t('calc.entryStopDiffer')]
      : []

  return (
    <CalculatorLayout
      title={t('calc.positionSize.title')}
      subtitle={t('calc.positionSize.subtitle')}
      docSlug="calculator-position-size"
      notices={notices}
      inputs={
        <>
          <NumberField
            label={t('fields.accountSize')}
            unit={currencySymbol(preferences.currency)}
            value={accountSize}
            onChange={setAccountSize}
            min={0}
          />
          <NumberField
            label={t('fields.risk')}
            value={risk}
            onChange={setRisk}
            unitOptions={unitOptions}
            unitValue={riskUnit}
            onUnitChange={switchRiskUnit}
            min={0}
            max={riskUnit === 'percent' ? 100 : undefined}
            hint={riskUnit === 'currency' ? t('calc.positionSize.riskHint') : undefined}
          />
          <NumberField
            label={t('fields.entryPrice')}
            value={entryPrice}
            onChange={setEntryPrice}
            min={0}
          />
          <NumberField
            label={t('fields.stopPrice')}
            value={stopPrice}
            onChange={setStopPrice}
            min={0}
          />
          <NumberField
            label={t('fields.leverage')}
            unit="×"
            value={leverage}
            onChange={setLeverage}
            min={1}
          />
          <NumberField
            label={t('fields.feePerSide')}
            value={fee}
            onChange={setFee}
            unitOptions={unitOptions}
            unitValue={feeUnit}
            onUnitChange={switchFeeUnit}
            min={0}
            hint={feeUnit === 'currency' ? t('calc.positionSize.feeHint') : undefined}
          />
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label={t('calc.positionSize.positionSize')}
              value={formatNumber(result.positionSize, { maximumFractionDigits: 6 })}
              hint={t('calc.units')}
              tone="primary"
              size="lg"
            />
            <Stat
              label={t('calc.positionSize.riskAmount')}
              value={formatCurrency(result.riskAmount, preferences.currency)}
              hint={
                preferences.feesInRisk
                  ? t('calc.positionSize.riskHintFees')
                  : t('calc.positionSize.riskHintOnly')
              }
            />
            <Stat
              label={t('calc.positionSize.stopDistance')}
              value={`${formatPrice(result.stopDistance)} · ${formatNumber(result.stopDistancePercent, { maximumFractionDigits: 2 })}%`}
            />
            <Stat
              label={t('calc.positionSize.notional')}
              value={formatCurrency(result.positionNotional, preferences.currency)}
            />
            <Stat
              label={t('calc.positionSize.requiredMargin')}
              value={formatCurrency(result.requiredMargin, preferences.currency)}
              hint={t('calc.percentOfAccount', {
                value: formatNumber(result.marginPercentOfAccount, { maximumFractionDigits: 1 }),
              })}
            />
            <Stat
              label={t('calc.positionSize.feesRoundTrip')}
              value={formatCurrency(result.feeEstimate, preferences.currency)}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('calc.positionSize.empty')}</p>
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
