import { useMemo, useState } from 'react'
import { calculateAverageEntry } from '@/calculations/averageEntry'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { useI18n } from '@/i18n/I18nContext'
import { formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function AverageEntryCalculator() {
  const { t } = useI18n()
  const [existingSize, setExistingSize] = useState<number | null>(null)
  const [existingEntryPrice, setExistingEntryPrice] = useState<number | null>(null)
  const [addSize, setAddSize] = useState<number | null>(null)
  const [addPrice, setAddPrice] = useState<number | null>(null)

  const result = useMemo(() => {
    if (
      existingSize === null ||
      existingEntryPrice === null ||
      addSize === null ||
      addPrice === null
    ) {
      return null
    }
    return calculateAverageEntry({ existingSize, existingEntryPrice, addSize, addPrice })
  }, [existingSize, existingEntryPrice, addSize, addPrice])

  return (
    <CalculatorLayout
      title={t('calc.averageEntry.title')}
      subtitle={t('calc.averageEntry.subtitle')}
      docSlug="calculator-average-entry"
      inputs={
        <>
          <NumberField
            label={t('fields.existingSize')}
            value={existingSize}
            onChange={setExistingSize}
            min={0}
            hint={t('calc.averageEntry.existingSizeHint')}
          />
          <NumberField
            label={t('fields.existingEntryPrice')}
            value={existingEntryPrice}
            onChange={setExistingEntryPrice}
            min={0}
          />
          <NumberField label={t('fields.addSize')} value={addSize} onChange={setAddSize} min={0} />
          <NumberField
            label={t('fields.addPrice')}
            value={addPrice}
            onChange={setAddPrice}
            min={0}
          />
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label={t('calc.averageEntry.averageEntry')}
              value={formatPrice(result.averageEntryPrice)}
              tone="primary"
              size="lg"
            />
            <Stat
              label={t('calc.averageEntry.changeVsPrevious')}
              value={`${formatNumber(result.priceChangePercent, { maximumFractionDigits: 2 })}%`}
              tone={result.priceChangePercent <= 0 ? 'profit' : 'warning'}
              hint={t('calc.averageEntry.changeHint')}
            />
            <Stat
              label={t('calc.averageEntry.totalSize')}
              value={formatNumber(result.totalSize, { maximumFractionDigits: 6 })}
            />
            <Stat
              label={t('calc.averageEntry.totalNotional')}
              value={formatNumber(result.totalNotional, { maximumFractionDigits: 2 })}
            />
            <Stat
              label={t('calc.averageEntry.addedNotional')}
              value={formatNumber(result.addedNotional, { maximumFractionDigits: 2 })}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">{t('calc.averageEntry.empty')}</p>
        )
      }
    />
  )
}

export function AverageEntryPage() {
  return (
    <PreferencesGate>
      <AverageEntryCalculator />
    </PreferencesGate>
  )
}
