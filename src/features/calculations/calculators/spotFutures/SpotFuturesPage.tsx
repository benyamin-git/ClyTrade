import { useMemo, useState } from 'react'
import { calculateSpotFutures } from '@/calculations/spotFutures'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber } from '@/lib/format'
import { NumberField, type NumberUnitOption } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'
import type { UnitMode } from '../../logic/units'

function SpotFuturesCalculator() {
  const { preferences } = usePreferences()
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
      title="Spot ↔ Futures"
      subtitle="The same capital in spot versus a leveraged position"
      docSlug="calculator-spot-futures"
      inputs={
        <>
          <NumberField
            label="Capital"
            unit={currencySymbol(preferences.currency)}
            value={capital}
            onChange={setCapital}
            min={0}
          />
          <NumberField label="Price" value={price} onChange={setPrice} min={0} />
          <NumberField label="Leverage" unit="×" value={leverage} onChange={setLeverage} min={1} />
          <NumberField
            label="Contract size"
            value={contractSize}
            onChange={setContractSize}
            min={0}
            hint="1 = one unit per contract"
          />
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
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
                Spot (1×)
              </h3>
              <ResultsGrid>
                <Stat
                  label="Quantity"
                  value={formatNumber(result.spotQuantity, { maximumFractionDigits: 6 })}
                  size="lg"
                />
                <Stat
                  label="Notional"
                  value={formatCurrency(result.spotNotional, preferences.currency)}
                />
                <Stat
                  label="Fee (one side)"
                  value={formatCurrency(result.spotFee, preferences.currency)}
                />
              </ResultsGrid>
            </div>
            <div>
              <h3 className="mb-2 text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
                Futures ({formatNumber(leverage ?? 0, { maximumFractionDigits: 2 })}×)
              </h3>
              <ResultsGrid>
                <Stat
                  label="Quantity"
                  value={formatNumber(result.futuresQuantity, { maximumFractionDigits: 6 })}
                  tone="primary"
                  size="lg"
                />
                <Stat
                  label="Notional"
                  value={formatCurrency(result.futuresNotional, preferences.currency)}
                />
                <Stat
                  label="Fee (one side)"
                  value={formatCurrency(result.futuresFee, preferences.currency)}
                />
                <Stat
                  label="Contracts"
                  value={formatNumber(result.futuresContracts, { maximumFractionDigits: 4 })}
                />
                <Stat
                  label="Liquidation move"
                  value={`${formatNumber(result.liquidationMovePercent, { maximumFractionDigits: 2 })}%`}
                  tone="loss"
                  hint="ignores maintenance margin"
                />
              </ResultsGrid>
            </div>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Enter capital and price to compare spot and futures sizing.
          </p>
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
