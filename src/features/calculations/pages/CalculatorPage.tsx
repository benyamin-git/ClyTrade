import { useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { currencySymbol } from '@/lib/currency'
import { formatCurrency, formatNumber, formatPercent, formatPrice } from '@/lib/format'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { HelpButton } from '@/ui/components/HelpButton'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import {
  applyCalculatorDefaults,
  resetCalculatorInputs,
  setCalculatorInput,
  useCalculatorInputs,
} from '../logic/calculatorInputs'
import { calculatePosition } from '../logic/positionCalculator'
import type { CalculatorPageProps } from '../registry'

function ResultsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 [&>div]:rounded-app-sm [&>div]:bg-surface-container [&>div]:p-3">
      {children}
    </div>
  )
}

export function CalculatorPage({ docSlug }: CalculatorPageProps) {
  const { preferences, ready } = usePreferences()
  const { t } = useI18n()
  const inputs = useCalculatorInputs()
  const result = useMemo(() => calculatePosition(inputs), [inputs])
  const hasResults =
    result !== null && Object.values(result).some((value) => typeof value === 'number')
  const currency = preferences.currency
  const symbol = currencySymbol(currency)

  useEffect(() => {
    if (!ready) return
    applyCalculatorDefaults({
      leverage: preferences.leverage,
      feePercent: preferences.feePercent,
      maintenanceMarginPercent: preferences.maintenanceMarginPercent,
    })
  }, [ready, preferences.leverage, preferences.feePercent, preferences.maintenanceMarginPercent])

  function pnlTone(value: number) {
    return value > 0 ? 'profit' : value < 0 ? 'loss' : 'default'
  }

  function focusNextInput(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    if (!(event.target instanceof HTMLInputElement)) return
    const fields = Array.from(event.currentTarget.querySelectorAll('input'))
    const next = fields[fields.indexOf(event.target) + 1]
    if (!next) return
    event.preventDefault()
    next.focus()
  }

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <header className="flex shrink-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{t('calc.title')}</h1>
          <p className="truncate text-sm text-on-surface-variant">{t('calc.subtitle')}</p>
        </div>
        <HelpButton docSlug={docSlug} />
      </header>

      <Card title={t('calc.inputs')} className="shrink-0">
        <div
          className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3"
          onKeyDown={focusNextInput}
        >
          <NumberField
            label={t('fields.risk')}
            unit={symbol}
            value={inputs.risk}
            onChange={(value) => setCalculatorInput('risk', value)}
            min={0}
          />
          <NumberField
            label={t('fields.entryPrice')}
            value={inputs.entryPrice}
            onChange={(value) => setCalculatorInput('entryPrice', value)}
            min={0}
          />
          <NumberField
            label={t('fields.targetPrice')}
            value={inputs.targetPrice}
            onChange={(value) => setCalculatorInput('targetPrice', value)}
            min={0}
          />
          <NumberField
            label={t('fields.stopPrice')}
            value={inputs.stopPrice}
            onChange={(value) => setCalculatorInput('stopPrice', value)}
            min={0}
          />
          <NumberField
            label={t('fields.feePerSide')}
            unit="%"
            value={inputs.feePercent}
            onChange={(value) => setCalculatorInput('feePercent', value)}
            min={0}
          />
          <NumberField
            label={t('fields.leverage')}
            unit="×"
            value={inputs.leverage}
            onChange={(value) => setCalculatorInput('leverage', value)}
            min={1}
          />
          <NumberField
            label={t('fields.maintenanceMargin')}
            unit="%"
            value={inputs.maintenanceMarginPercent}
            onChange={(value) => setCalculatorInput('maintenanceMarginPercent', value)}
            min={0}
            max={100}
          />
          <NumberField
            label={t('calc.winRate')}
            unit="%"
            value={inputs.winRatePercent}
            onChange={(value) => setCalculatorInput('winRatePercent', value)}
            min={0}
            max={100}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-outline-variant/50 px-4 py-3">
          <Button variant="text" onClick={resetCalculatorInputs}>
            {t('calc.clear')}
          </Button>
        </div>
      </Card>

      <Card title={t('calc.results')} className="shrink-0">
        <div role="status" aria-live="polite" className="p-3">
          {result && hasResults ? (
            <ResultsGrid>
              {result.requiredMargin !== null ? (
                <Stat
                  label={t('calc.requiredMargin')}
                  value={formatCurrency(result.requiredMargin, currency)}
                />
              ) : null}
              {result.rr !== null ? (
                <Stat
                  label={t('calc.rr')}
                  value={`${formatNumber(result.rr, { maximumFractionDigits: 2 })}R`}
                  tone="primary"
                  size="lg"
                />
              ) : null}
              {result.pnl !== null ? (
                <Stat
                  label={t('calc.pnl')}
                  value={formatCurrency(result.pnl, currency)}
                  hint={t('calc.netOfFees')}
                  tone={pnlTone(result.pnl)}
                />
              ) : null}
              {result.notional !== null ? (
                <Stat
                  label={t('calc.notional')}
                  value={formatCurrency(result.notional, currency)}
                />
              ) : null}
              {result.unitSize !== null ? (
                <Stat
                  label={t('calc.unitSize')}
                  value={formatNumber(result.unitSize, { maximumFractionDigits: 6 })}
                  hint={t('calc.units')}
                />
              ) : null}
              {result.stopDistance !== null && result.stopDistancePercent !== null ? (
                <Stat
                  label={t('calc.stopDistance')}
                  value={`${formatPrice(result.stopDistance)} · ${formatPercent(result.stopDistancePercent)}`}
                />
              ) : null}
              {result.targetDistance !== null && result.targetDistancePercent !== null ? (
                <Stat
                  label={t('calc.targetDistance')}
                  value={`${formatPrice(result.targetDistance)} · ${formatPercent(result.targetDistancePercent)}`}
                />
              ) : null}
              {result.liquidationDistance !== null && result.liquidationDistancePercent !== null ? (
                <Stat
                  label={t('calc.liquidationDistance')}
                  value={`${formatPrice(result.liquidationDistance)} · ${formatPercent(result.liquidationDistancePercent)}`}
                />
              ) : null}
              {result.liquidationPrice !== null ? (
                <Stat
                  label={t('calc.liquidationPrice')}
                  value={formatPrice(result.liquidationPrice)}
                />
              ) : null}
              {result.breakEvenWinRatePercent !== null ? (
                <Stat
                  label={t('calc.breakEvenWinRate')}
                  value={formatPercent(result.breakEvenWinRatePercent)}
                />
              ) : null}
              {result.expectancyR !== null ? (
                <Stat
                  label={t('calc.expectancy')}
                  value={`${formatNumber(result.expectancyR, { maximumFractionDigits: 2 })}R`}
                  tone={pnlTone(result.expectancyR)}
                />
              ) : null}
              {result.recommendedRiskPercent !== null ? (
                <Stat
                  label={t('calc.recommendedRisk')}
                  value={formatPercent(result.recommendedRiskPercent)}
                  hint={t('calc.recommendedRiskHint')}
                />
              ) : null}
            </ResultsGrid>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t('calc.emptyTitle')}</p>
              <p className="text-xs text-on-surface-variant">{t('calc.emptyDescription')}</p>
            </div>
          )}
        </div>
      </Card>
    </ViewportPage>
  )
}
