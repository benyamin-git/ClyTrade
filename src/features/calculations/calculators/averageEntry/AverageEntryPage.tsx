import { useMemo, useState } from 'react'
import { calculateAverageEntry } from '@/calculations/averageEntry'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { formatNumber, formatPrice } from '@/lib/format'
import { NumberField } from '@/ui/components/NumberField'
import { Stat } from '@/ui/components/Stat'
import { CalculatorLayout, ResultsGrid } from '../../components/CalculatorLayout'

function AverageEntryCalculator() {
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
      title="Average Entry / DCA"
      subtitle="Blended entry price when scaling into a position"
      docSlug="calculator-average-entry"
      inputs={
        <>
          <NumberField
            label="Existing size"
            value={existingSize}
            onChange={setExistingSize}
            min={0}
            hint="Use 0 for a fresh entry"
          />
          <NumberField
            label="Existing entry price"
            value={existingEntryPrice}
            onChange={setExistingEntryPrice}
            min={0}
          />
          <NumberField label="Add size" value={addSize} onChange={setAddSize} min={0} />
          <NumberField label="Add price" value={addPrice} onChange={setAddPrice} min={0} />
        </>
      }
      results={
        result ? (
          <ResultsGrid>
            <Stat
              label="Average entry"
              value={formatPrice(result.averageEntryPrice)}
              tone="primary"
              size="lg"
            />
            <Stat
              label="Change vs previous"
              value={`${formatNumber(result.priceChangePercent, { maximumFractionDigits: 2 })}%`}
              tone={result.priceChangePercent <= 0 ? 'profit' : 'warning'}
              hint="negative = lower average (for a long)"
            />
            <Stat
              label="Total size"
              value={formatNumber(result.totalSize, { maximumFractionDigits: 6 })}
            />
            <Stat
              label="Total notional"
              value={formatNumber(result.totalNotional, { maximumFractionDigits: 2 })}
            />
            <Stat
              label="Added notional"
              value={formatNumber(result.addedNotional, { maximumFractionDigits: 2 })}
            />
          </ResultsGrid>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Enter the existing position and the add to see the blended entry.
          </p>
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
