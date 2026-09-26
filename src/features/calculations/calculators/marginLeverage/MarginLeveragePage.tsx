import { useMemo, useState } from 'react'
import { calculateMarginLeverage } from '@/calculations/marginLeverage'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function MarginLeverageCalculator() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
  const [accountSize, setAccountSize] = useState<number | null>(preferences.accountSize)
  const [positionNotional, setPositionNotional] = useState<number | null>(null)
  const [leverage, setLeverage] = useState<number | null>(preferences.leverage)
  const [maintenanceMarginPercent, setMaintenanceMarginPercent] = useState<number | null>(
    preferences.maintenanceMarginPercent,
  )

  const result = useMemo(() => {
    if (
      accountSize === null ||
      positionNotional === null ||
      leverage === null ||
      maintenanceMarginPercent === null
    ) {
      return null
    }
    return calculateMarginLeverage({
      accountSize,
      positionNotional,
      leverage,
      maintenanceMarginPercent,
    })
  }, [accountSize, positionNotional, leverage, maintenanceMarginPercent])

  const overBudget = result !== null && result.marginPercentOfAccount > 100

  return (
    <CalculatorLayout
      title={t('calc.marginLeverage.title')}
      subtitle={t('calc.marginLeverage.subtitle')}
      docSlug="calculator-margin-leverage"
      notices={overBudget ? [t('calc.marginLeverage.overBudget')] : []}
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
            label={t('fields.positionNotional')}
            unit={currencySymbol(preferences.currency)}
            value={positionNotional}
            onChange={setPositionNotional}
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
            label={t('fields.maintenanceMargin')}
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
              label={t('calc.marginLeverage.requiredMargin')}
              value={formatCurrency(result.requiredMargin, preferences.currency)}
              tone="primary"
              size="lg"
            />
            <Stat
              label={t('calc.marginLeverage.marginOfAccount')}
              value={`${formatNumber(result.marginPercentOfAccount, { maximumFractionDigits: 1 })}%`}
              tone={overBudget ? 'loss' : 'default'}
            />
            <Stat
              label={t('calc.marginLeverage.maxNotional')}
              value={formatCurrency(result.maxPositionNotional, preferences.currency)}
              hint={t('calc.marginLeverage.atLeverage', {
                leverage: formatNumber(leverage ?? 0, { maximumFractionDigits: 2 }),
              })}
            />
            <Stat
              label={t('calc.marginLeverage.effectiveLeverage')}
              value={`${formatNumber(result.effectiveLeverage, { maximumFractionDigits: 2 })}×`}
            />
            <Stat
              label={t('calc.marginLeverage.liquidationMove')}
              value={`${formatNumber(result.liquidationMovePercent, { maximumFractionDigits: 2 })}%`}
              hint={t('calc.marginLeverage.liquidationMoveHint')}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('calc.marginLeverage.empty')}</p>
        )
      }
    />
  )
}

export function MarginLeveragePage() {
  return (
    <PreferencesGate>
      <MarginLeverageCalculator />
    </PreferencesGate>
  )
}
