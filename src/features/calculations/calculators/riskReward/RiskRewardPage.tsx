import { useMemo, useState } from 'react'
import { calculateRiskReward } from '@/calculations/riskReward'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function RiskRewardCalculator() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
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
      ? [t('calc.entryStopDiffer')]
      : []

  const grossHint = t('calc.grossValue', { value: formatPrice(result?.risk ?? 0) })
  const grossRewardHint = t('calc.grossValue', { value: formatPrice(result?.reward ?? 0) })

  return (
    <CalculatorLayout
      title={t('calc.riskReward.title')}
      subtitle={t('calc.riskReward.subtitle')}
      docSlug="calculator-risk-reward"
      notices={notices}
      inputs={
        <>
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
            label={t('fields.targetPrice')}
            value={targetPrice}
            onChange={setTargetPrice}
            min={0}
          />
          <NumberField
            label={t('calc.riskReward.winRate')}
            unit="%"
            value={winRatePercent}
            onChange={setWinRatePercent}
            min={0}
            max={100}
            hint={t('calc.riskReward.winRateHint')}
          />
          <NumberField
            label={t('fields.entryFee')}
            unit="%"
            value={entryFeePercent}
            onChange={setEntryFeePercent}
            min={0}
          />
          <NumberField
            label={t('fields.exitFee')}
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
              label={t('calc.riskReward.riskReward')}
              value={`${formatNumber(result.riskRewardRatio, { maximumFractionDigits: 2 })}R`}
              tone={result.riskRewardRatio >= 1 ? 'profit' : 'warning'}
              size="lg"
            />
            <Stat
              label={t('calc.riskReward.breakEvenWinRate')}
              value={`${formatNumber(result.breakEvenWinRatePercent, { maximumFractionDigits: 1 })}%`}
            />
            <Stat
              label={t('calc.riskReward.expectancy')}
              value={
                result.expectancyR === null
                  ? '—'
                  : `${formatNumber(result.expectancyR, { maximumFractionDigits: 2 })}R`
              }
              tone={
                result.expectancyR === null ? 'default' : result.expectancyR > 0 ? 'profit' : 'loss'
              }
              hint={
                result.expectancyR === null
                  ? t('calc.riskReward.expectancyHintEmpty')
                  : t('calc.riskReward.expectancyHint')
              }
            />
            <Stat
              label={t('fields.risk')}
              value={formatPrice(preferences.feesInRisk ? result.netRisk : result.risk)}
              hint={preferences.feesInRisk ? grossHint : t('calc.priceDistance')}
            />
            <Stat
              label={t('calc.riskReward.reward')}
              value={formatPrice(preferences.feesInRisk ? result.netReward : result.reward)}
              hint={preferences.feesInRisk ? grossRewardHint : t('calc.priceDistance')}
            />
            <Stat
              label={t('calc.riskReward.stopTargetMove')}
              value={`${formatNumber(result.stopMovePercent, { maximumFractionDigits: 2 })}% / ${formatNumber(result.targetMovePercent, { maximumFractionDigits: 2 })}%`}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('calc.riskReward.empty')}</p>
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
