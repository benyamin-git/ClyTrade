import { useMemo, useState } from 'react'
import { calculateLiquidationPrice } from '@/calculations/liquidationPrice'
import type { Direction } from '@/calculations/types'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function LiquidationPriceCalculator() {
  const { preferences } = usePreferences()
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [direction, setDirection] = useState<Direction>('long')
  const [maintenanceMarginPercent, setMaintenanceMarginPercent] = useState<number | null>(
    preferences.maintenanceMarginPercent,
  )

  const result = useMemo(() => {
    if (entryPrice === null || leverage === null || maintenanceMarginPercent === null) return null
    return calculateLiquidationPrice({
      entryPrice,
      leverage,
      direction,
      maintenanceMarginPercent,
    })
  }, [entryPrice, leverage, direction, maintenanceMarginPercent])

  return (
    <CalculatorLayout
      title="Liquidation Price"
      subtitle="Estimated isolated-margin liquidation and how far away it is"
      docSlug="calculator-liquidation-price"
      inputs={
        <>
          <NumberField label="Entry price" value={entryPrice} onChange={setEntryPrice} min={0} />
          <NumberField label="Leverage" unit="×" value={leverage} onChange={setLeverage} min={1} />
          <div className="flex flex-col gap-1">
            <span className="text-2xs font-medium tracking-wide text-on-surface-variant uppercase">
              Direction
            </span>
            <SegmentedControl
              value={direction}
              onChange={setDirection}
              options={[
                { value: 'long', label: 'Long' },
                { value: 'short', label: 'Short' },
              ]}
            />
          </div>
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
              label="Liquidation price"
              value={formatPrice(result.liquidationPrice)}
              tone="loss"
              size="lg"
            />
            <Stat
              label="Distance"
              value={`${formatNumber(result.distancePercent, { maximumFractionDigits: 2 })}%`}
              hint={formatPrice(result.distanceAbsolute)}
            />
            <Stat label="Direction" value={direction === 'long' ? 'Long' : 'Short'} />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Enter an entry price to see results. Liquidation is left empty when maintenance margin
            consumes the entire buffer.
          </p>
        )
      }
    />
  )
}

export function LiquidationPricePage() {
  return (
    <PreferencesGate>
      <LiquidationPriceCalculator />
    </PreferencesGate>
  )
}
