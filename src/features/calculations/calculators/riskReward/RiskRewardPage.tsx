import { useMemo, useState } from 'react'
import { calculateRiskReward } from '@/calculations/riskReward'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function RiskRewardCalculator() {
  const { preferences } = usePreferences()
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [stopPrice, setStopPrice] = useState<number | null>(null)
  const [targetPrice, setTargetPrice] = useState<number | null>(null)
  const [winRatePercent, setWinRatePercent] = useState<number | null>(null)
  const [entryFeePercent, setEntryFeePercent] = useState<number | null>(preferences.feePercent)
  const [exitFeePercent, setExitFeePercent] = useState<number | null>(preferences.feePercent)

  const result = useMemo(() => {
    if (
      entryPrice === null ||
      stopPrice === null ||
      targetPrice === null ||
      entryFeePercent === null ||
      exitFeePercent === null
    ) {
      return null
    }
    return calculateRiskReward({
      entryPrice,
      stopPrice,
      targetPrice,
      winRatePercent,
      entryFeePercent,
      exitFeePercent,
      includeFees: preferences.feesInRisk,
    })
  }, [
    entryPrice,
    stopPrice,
    targetPrice,
    winRatePercent,
    entryFeePercent,
    exitFeePercent,
    preferences.feesInRisk,
  ])

  const notices =
    entryPrice !== null && stopPrice !== null && entryPrice === stopPrice
      ? ['Entry and stop must differ.']
      : []

  return (
    <CalculatorLayout
      title="Risk / Reward"
      subtitle="R multiples, break-even win rate and expectancy"
      docSlug="calculator-risk-reward"
      notices={notices}
      inputs={
        <>
          <NumberField label="Entry price" value={entryPrice} onChange={setEntryPrice} min={0} />
          <NumberField label="Stop price" value={stopPrice} onChange={setStopPrice} min={0} />
          <NumberField label="Target price" value={targetPrice} onChange={setTargetPrice} min={0} />
          <NumberField
            label="Win rate (optional)"
            unit="%"
            value={winRatePercent}
            onChange={setWinRatePercent}
            min={0}
            max={100}
            hint="Add your historical win rate to see expectancy"
          />
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
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label="Risk / Reward"
              value={`${formatNumber(result.riskRewardRatio, { maximumFractionDigits: 2 })}R`}
              tone={result.riskRewardRatio >= 1 ? 'profit' : 'warning'}
              size="lg"
            />
            <Stat
              label="Break-even win rate"
              value={`${formatNumber(result.breakEvenWinRatePercent, { maximumFractionDigits: 1 })}%`}
            />
            <Stat
              label="Expectancy"
              value={
                result.expectancyR === null
                  ? '—'
                  : `${formatNumber(result.expectancyR, { maximumFractionDigits: 2 })}R`
              }
              tone={
                result.expectancyR === null ? 'default' : result.expectancyR > 0 ? 'profit' : 'loss'
              }
              hint={result.expectancyR === null ? 'Enter a win rate' : 'per trade at this win rate'}
            />
            <Stat
              label="Risk"
              value={formatPrice(preferences.feesInRisk ? result.netRisk : result.risk)}
              hint={preferences.feesInRisk ? `gross ${formatPrice(result.risk)}` : 'price distance'}
            />
            <Stat
              label="Reward"
              value={formatPrice(preferences.feesInRisk ? result.netReward : result.reward)}
              hint={
                preferences.feesInRisk ? `gross ${formatPrice(result.reward)}` : 'price distance'
              }
            />
            <Stat
              label="Stop / target move"
              value={`${formatNumber(result.stopMovePercent, { maximumFractionDigits: 2 })}% / ${formatNumber(result.targetMovePercent, { maximumFractionDigits: 2 })}%`}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Enter entry, stop and target prices to see results.
          </p>
        )
      }
    />
  )
}

export function RiskRewardPage() {
  return (
    <PreferencesGate>
      <RiskRewardCalculator />
    </PreferencesGate>
  )
}
