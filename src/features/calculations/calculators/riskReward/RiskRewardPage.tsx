import { useMemo, useState } from 'react'
import { calculateRiskReward } from '@/calculations/riskReward'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function RiskRewardCalculator() {
  const [entryPrice, setEntryPrice] = useState<number | null>(null)
  const [stopPrice, setStopPrice] = useState<number | null>(null)
  const [targetPrice, setTargetPrice] = useState<number | null>(null)
  const [winRatePercent, setWinRatePercent] = useState<number | null>(null)

  const result = useMemo(() => {
    if (entryPrice === null || stopPrice === null || targetPrice === null) return null
    return calculateRiskReward({ entryPrice, stopPrice, targetPrice, winRatePercent })
  }, [entryPrice, stopPrice, targetPrice, winRatePercent])

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
            <Stat label="Risk" value={formatPrice(result.risk)} hint="price distance" />
            <Stat label="Reward" value={formatPrice(result.reward)} hint="price distance" />
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
