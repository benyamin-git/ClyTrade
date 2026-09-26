import { useMemo, useState } from 'react'
import { calculateFeesPnl } from '@/calculations/feesPnl'
import type { Direction } from '@/calculations/types'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber, formatPrice } from '@/lib/format'
import { NumberField, type NumberUnitOption } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'
import { convertUnit, toPercent, type UnitMode } from '../../logic/units'

function FeesPnlCalculator() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [exitPrice, setExitPrice] = useState<number | null>(null)
  const [size, setSize] = useState<number | null>(null)
  const [direction, setDirection] = useState<Direction>('long')
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [entryFee, setEntryFee] = useState<number | null>(preferences.feePercent)
  const [entryFeeUnit, setEntryFeeUnit] = useState<UnitMode>('percent')
  const [exitFee, setExitFee] = useState<number | null>(preferences.feePercent)
  const [exitFeeUnit, setExitFeeUnit] = useState<UnitMode>('percent')
  const [funding, setFunding] = useState<number | null>(0)
  const [fundingUnit, setFundingUnit] = useState<UnitMode>('percent')

  const unitOptions: readonly NumberUnitOption[] = [
    { value: 'percent', label: '%' },
    { value: 'currency', label: currencySymbol(preferences.currency) },
  ]

  const entryNotional = entryPrice !== null && size !== null ? entryPrice * size : null
  const exitNotional = exitPrice !== null && size !== null ? exitPrice * size : null

  const result = useMemo(() => {
    if (
      entryPrice === null ||
      exitPrice === null ||
      size === null ||
      leverage === null ||
      entryFee === null ||
      exitFee === null ||
      funding === null
    ) {
      return null
    }
    const entryFeePercent =
      entryFeeUnit === 'percent' ? entryFee : toPercent(entryFee, entryNotional)
    const exitFeePercent = exitFeeUnit === 'percent' ? exitFee : toPercent(exitFee, exitNotional)
    const fundingPercent = fundingUnit === 'percent' ? funding : toPercent(funding, entryNotional)
    if (entryFeePercent === null || exitFeePercent === null || fundingPercent === null) return null
    return calculateFeesPnl({
      entryPrice,
      exitPrice,
      size,
      direction,
      leverage,
      entryFeePercent,
      exitFeePercent,
      fundingPercent,
      accountSize: preferences.accountSize,
    })
  }, [
    entryPrice,
    exitPrice,
    size,
    direction,
    leverage,
    entryFee,
    entryFeeUnit,
    entryNotional,
    exitFee,
    exitFeeUnit,
    exitNotional,
    funding,
    fundingUnit,
    preferences.accountSize,
  ])

  function switchEntryFeeUnit(next: string) {
    const mode = next as UnitMode
    if (mode === entryFeeUnit) return
    setEntryFee(convertUnit(entryFee, entryFeeUnit, mode, entryNotional))
    setEntryFeeUnit(mode)
  }

  function switchExitFeeUnit(next: string) {
    const mode = next as UnitMode
    if (mode === exitFeeUnit) return
    setExitFee(convertUnit(exitFee, exitFeeUnit, mode, exitNotional))
    setExitFeeUnit(mode)
  }

  function switchFundingUnit(next: string) {
    const mode = next as UnitMode
    if (mode === fundingUnit) return
    setFunding(convertUnit(funding, fundingUnit, mode, entryNotional))
    setFundingUnit(mode)
  }

  return (
    <CalculatorLayout
      title={t('calc.feesPnl.title')}
      subtitle={t('calc.feesPnl.subtitle')}
      docSlug="calculator-fees-pnl"
      inputs={
        <>
          <NumberField
            label={t('fields.entryPrice')}
            value={entryPrice}
            onChange={setEntryPrice}
            min={0}
          />
          <NumberField
            label={t('fields.exitPrice')}
            value={exitPrice}
            onChange={setExitPrice}
            min={0}
          />
          <NumberField
            label={t('fields.size')}
            value={size}
            onChange={setSize}
            min={0}
            hint={t('calc.units')}
          />
          <div className="flex flex-col gap-1">
            <span className="text-2xs font-medium tracking-wide text-on-surface-variant uppercase">
              {t('fields.direction')}
            </span>
            <SegmentedControl
              value={direction}
              onChange={setDirection}
              options={[
                { value: 'long', label: t('direction.long') },
                { value: 'short', label: t('direction.short') },
              ]}
              ariaLabel={t('fields.direction')}
            />
          </div>
          <NumberField
            label={t('fields.leverage')}
            unit="×"
            value={leverage}
            onChange={setLeverage}
            min={1}
          />
          <NumberField
            label={t('fields.entryFee')}
            value={entryFee}
            onChange={setEntryFee}
            unitOptions={unitOptions}
            unitValue={entryFeeUnit}
            onUnitChange={switchEntryFeeUnit}
            min={0}
            hint={entryFeeUnit === 'currency' ? t('calc.feesPnl.absoluteCost') : undefined}
          />
          <NumberField
            label={t('fields.exitFee')}
            value={exitFee}
            onChange={setExitFee}
            unitOptions={unitOptions}
            unitValue={exitFeeUnit}
            onUnitChange={switchExitFeeUnit}
            min={0}
            hint={exitFeeUnit === 'currency' ? t('calc.feesPnl.absoluteCost') : undefined}
          />
          <NumberField
            label={t('fields.funding')}
            value={funding}
            onChange={setFunding}
            unitOptions={unitOptions}
            unitValue={fundingUnit}
            onUnitChange={switchFundingUnit}
            hint={
              fundingUnit === 'currency'
                ? t('calc.feesPnl.fundingHintCurrency')
                : t('calc.feesPnl.fundingHintPercent')
            }
          />
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label={t('calc.feesPnl.netPnl')}
              value={formatCurrency(result.netPnl, preferences.currency)}
              tone={result.netPnl >= 0 ? 'profit' : 'loss'}
              size="lg"
            />
            <Stat
              label={t('calc.feesPnl.grossPnl')}
              value={formatCurrency(result.grossPnl, preferences.currency)}
              tone={result.grossPnl >= 0 ? 'profit' : 'loss'}
            />
            <Stat
              label={t('calc.feesPnl.roiOnMargin')}
              value={`${formatNumber(result.roiOnMarginPercent, { maximumFractionDigits: 2 })}%`}
              tone={result.roiOnMarginPercent >= 0 ? 'profit' : 'loss'}
              hint={t('calc.percentOfAccount', {
                value: formatNumber(result.netPnlPercentOfAccount, { maximumFractionDigits: 2 }),
              })}
            />
            <Stat
              label={t('calc.feesPnl.entryExitFees')}
              value={`${formatCurrency(result.entryFee, preferences.currency)} / ${formatCurrency(result.exitFee, preferences.currency)}`}
            />
            <Stat
              label={t('calc.feesPnl.fundingCost')}
              value={formatCurrency(result.fundingCost, preferences.currency)}
            />
            <Stat
              label={t('calc.feesPnl.totalCosts')}
              value={formatCurrency(result.totalCosts, preferences.currency)}
            />
            <Stat
              label={t('calc.feesPnl.breakEvenMove')}
              value={`${formatNumber(result.breakEvenMovePercent, { maximumFractionDigits: 4 })}%`}
              hint={t('calc.feesPnl.breakEvenMoveHint')}
            />
            <Stat
              label={t('calc.feesPnl.margin')}
              value={formatCurrency(result.margin, preferences.currency)}
              hint={t('calc.entryValue', { value: formatPrice(entryPrice ?? 0) })}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('calc.feesPnl.empty')}</p>
        )
      }
    />
  )
}

export function FeesPnlPage() {
  return (
    <PreferencesGate>
      <FeesPnlCalculator />
    </PreferencesGate>
  )
}
