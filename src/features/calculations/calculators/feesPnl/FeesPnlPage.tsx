import { useMemo, useState } from 'react'
import { calculateFeesPnl } from '@/calculations/feesPnl'
import type { Direction } from '@/calculations/types'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { formatCurrency, formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function FeesPnlCalculator() {
  const { preferences } = usePreferences()
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [exitPrice, setExitPrice] = useState<number | null>(null)
  const [size, setSize] = useState<number | null>(null)
  const [direction, setDirection] = useState<Direction>('long')
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [entryFeePercent, setEntryFeePercent] = useState<number | null>(preferences.feePercent)
  const [exitFeePercent, setExitFeePercent] = useState<number | null>(preferences.feePercent)
  const [fundingPercent, setFundingPercent] = useState<number | null>(0)

  const result = useMemo(() => {
    if (
      entryPrice === null ||
      exitPrice === null ||
      size === null ||
      leverage === null ||
      entryFeePercent === null ||
      exitFeePercent === null ||
      fundingPercent === null
    ) {
      return null
    }
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
    entryFeePercent,
    exitFeePercent,
    fundingPercent,
    preferences.accountSize,
  ])

  return (
    <CalculatorLayout
      title="Fees & PnL"
      subtitle="Gross and net result after every cost"
      docSlug="calculator-fees-pnl"
      inputs={
        <>
          <NumberField label="Entry price" value={entryPrice} onChange={setEntryPrice} min={0} />
          <NumberField label="Exit price" value={exitPrice} onChange={setExitPrice} min={0} />
          <NumberField label="Size" value={size} onChange={setSize} min={0} hint="units" />
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
          <NumberField label="Leverage" unit="×" value={leverage} onChange={setLeverage} min={1} />
          <NumberField
            label="Entry fee"
            unit="%"
            value={entryFeePercent}
            onChange={setEntryFeePercent}
            min={0}
          />
          <NumberField
            label="Exit fee"
            unit="%"
            value={exitFeePercent}
            onChange={setExitFeePercent}
            min={0}
          />
          <NumberField
            label="Funding (total)"
            unit="%"
            value={fundingPercent}
            onChange={setFundingPercent}
            hint="Positive = paid over the hold"
          />
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label="Net PnL"
              value={formatCurrency(result.netPnl, preferences.currency)}
              tone={result.netPnl >= 0 ? 'profit' : 'loss'}
              size="lg"
            />
            <Stat
              label="Gross PnL"
              value={formatCurrency(result.grossPnl, preferences.currency)}
              tone={result.grossPnl >= 0 ? 'profit' : 'loss'}
            />
            <Stat
              label="ROI on margin"
              value={`${formatNumber(result.roiOnMarginPercent, { maximumFractionDigits: 2 })}%`}
              tone={result.roiOnMarginPercent >= 0 ? 'profit' : 'loss'}
              hint={`${formatNumber(result.netPnlPercentOfAccount, { maximumFractionDigits: 2 })}% of account`}
            />
            <Stat
              label="Entry / exit fees"
              value={`${formatCurrency(result.entryFee, preferences.currency)} / ${formatCurrency(result.exitFee, preferences.currency)}`}
            />
            <Stat
              label="Funding cost"
              value={formatCurrency(result.fundingCost, preferences.currency)}
            />
            <Stat
              label="Total costs"
              value={formatCurrency(result.totalCosts, preferences.currency)}
            />
            <Stat
              label="Break-even move"
              value={`${formatNumber(result.breakEvenMovePercent, { maximumFractionDigits: 4 })}%`}
              hint="price move needed to cover costs"
            />
            <Stat
              label="Margin"
              value={formatCurrency(result.margin, preferences.currency)}
              hint={`entry ${formatPrice(entryPrice ?? 0)}`}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Enter entry, exit and size to see results.
          </p>
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
