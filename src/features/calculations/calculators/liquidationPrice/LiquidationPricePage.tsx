import { useMemo, useState } from 'react'
import { calculateLiquidationPrice } from '@/calculations/liquidationPrice'
import type { Direction } from '@/calculations/types'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { usePreferences } from '@/features/settings/SettingsContext'
import { useI18n } from '@/i18n/I18nContext'
import { formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function LiquidationPriceCalculator() {
  const { preferences } = usePreferences()
  const { t } = useI18n()
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
      title={t('calc.liquidationPrice.title')}
      subtitle={t('calc.liquidationPrice.subtitle')}
      docSlug="calculator-liquidation-price"
      inputs={
        <>
          <NumberField
            label={t('fields.entryPrice')}
            value={entryPrice}
            onChange={setEntryPrice}
            min={0}
          />
          <NumberField
            label={t('fields.leverage')}
            unit="×"
            value={leverage}
            onChange={setLeverage}
            min={1}
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
            />
          </div>
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
              label={t('calc.liquidationPrice.liquidationPrice')}
              value={formatPrice(result.liquidationPrice)}
              tone="loss"
              size="lg"
            />
            <Stat
              label={t('calc.liquidationPrice.distance')}
              value={`${formatNumber(result.distancePercent, { maximumFractionDigits: 2 })}%`}
              hint={formatPrice(result.distanceAbsolute)}
            />
            <Stat
              label={t('fields.direction')}
              value={direction === 'long' ? t('direction.long') : t('direction.short')}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('calc.liquidationPrice.empty')}</p>
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
