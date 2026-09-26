import { useMemo, useState } from 'react'
import { calculateSpotFutures } from '@/calculations/spotFutures'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber } from '@/lib/format'
import { NumberField, type NumberUnitOption } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'
import type { UnitMode } from '../../logic/units'

function SpotFuturesCalculator() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const [capital, setCapital] = useState<number | null>(preferences.accountSize)
  const [price, setPrice] = useState<number | null>(null)
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [contractSize, setContractSize] = useState<number | null>(1)
  const [fee, setFee] = useState<number | null>(preferences.feePercent)
  const [feeUnit, setFeeUnit] = useState<UnitMode>('percent')

  const unitOptions: readonly NumberUnitOption[] = [
    { value: 'percent', label: '%' },
    { value: 'currency', label: currencySymbol(preferences.currency) },
  ]

  const result = useMemo(() => {
    if (
      capital === null ||
      price === null ||
      leverage === null ||
      contractSize === null ||
      fee === null
    ) {
      return null
    }
    return calculateSpotFutures({
      capital,
      price,
      leverage,
      contractSize,
      feePercent: feeUnit === 'percent' ? fee : null,
      feeAmount: feeUnit === 'currency' ? fee : null,
    })
  }, [capital, price, leverage, contractSize, fee, feeUnit])

  function switchFeeUnit(next: string) {
    const mode = next as UnitMode
    if (mode === feeUnit) return
    setFee(null)
    setFeeUnit(mode)
  }

  return (
    <CalculatorLayout
      title={t('calc.spotFutures.title')}
      subtitle={t('calc.spotFutures.subtitle')}
      docSlug="calculator-spot-futures"
      inputs={
        <>
          <NumberField
            label={t('fields.capital')}
            unit={currencySymbol(preferences.currency)}
            value={capital}
            onChange={setCapital}
            min={0}
          />
          <NumberField label={t('fields.price')} value={price} onChange={setPrice} min={0} />
          <NumberField
            label={t('fields.leverage')}
            unit="×"
            value={leverage}
            onChange={setLeverage}
            min={1}
          />
          <NumberField
            label={t('fields.contractSize')}
            value={contractSize}
            onChange={setContractSize}
            min={0}
            hint={t('calc.spotFutures.contractSizeHint')}
          />
          <NumberField
            label={t('fields.feePerSide')}
            value={fee}
            onChange={setFee}
            unitOptions={unitOptions}
            unitValue={feeUnit}
            onUnitChange={switchFeeUnit}
            min={0}
            hint={feeUnit === 'currency' ? t('calc.spotFutures.feeHint') : undefined}
          />
        </>
      }
      results={
        result ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
                {t('calc.spotFutures.spotSection')}
              </h3>
              <ResultsGrid>
                <Stat
                  label={t('fields.quantity')}
                  value={formatNumber(result.spotQuantity, { maximumFractionDigits: 6 })}
                  size="lg"
                />
                <Stat
                  label={t('calc.spotFutures.notional')}
                  value={formatCurrency(result.spotNotional, preferences.currency)}
                />
                <Stat
                  label={t('calc.spotFutures.feeOneSide')}
                  value={formatCurrency(result.spotFee, preferences.currency)}
                />
              </ResultsGrid>
            </div>
            <div>
              <h3 className="mb-2 text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
                {t('calc.spotFutures.futuresSection', {
                  leverage: formatNumber(leverage ?? 0, { maximumFractionDigits: 2 }),
                })}
              </h3>
              <ResultsGrid>
                <Stat
                  label={t('fields.quantity')}
                  value={formatNumber(result.futuresQuantity, { maximumFractionDigits: 6 })}
                  tone="primary"
                  size="lg"
                />
                <Stat
                  label={t('calc.spotFutures.notional')}
                  value={formatCurrency(result.futuresNotional, preferences.currency)}
                />
                <Stat
                  label={t('calc.spotFutures.feeOneSide')}
                  value={formatCurrency(result.futuresFee, preferences.currency)}
                />
                <Stat
                  label={t('calc.spotFutures.contracts')}
                  value={formatNumber(result.futuresContracts, { maximumFractionDigits: 4 })}
                />
                <Stat
                  label={t('calc.spotFutures.liquidationMove')}
                  value={`${formatNumber(result.liquidationMovePercent, { maximumFractionDigits: 2 })}%`}
                  tone="loss"
                  hint={t('calc.spotFutures.liquidationMoveHint')}
                />
              </ResultsGrid>
            </div>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('calc.spotFutures.empty')}</p>
        )
      }
    />
  )
}

export function SpotFuturesPage() {
  return (
    <PreferencesGate>
      <SpotFuturesCalculator />
    </PreferencesGate>
  )
}
