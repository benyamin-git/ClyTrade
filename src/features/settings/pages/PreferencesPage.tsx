import { useMemo, useState } from 'react'
import type { Preferences } from '@/data/models/settings'
import { usePreferences } from '@/features/settings/SettingsContext'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { CURRENCIES, currencySymbol } from '@/lib/currency'
import { TIME_RANGES } from '@/lib/dates'
import { Card } from '@/ui/components/Card'
import { Field } from '@/ui/components/Field'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { SelectField } from '@/ui/components/SelectField'
import { ViewportPage } from '@/ui/layout/ViewportPage'

function PreferencesForm() {
  const { preferences, setPreferences } = usePreferences()
  const [draft, setDraft] = useState<Preferences>(preferences)

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...draft, [key]: value }
    setDraft(next)
    setPreferences(next)
  }

  const currencyOptions = useMemo(() => {
    const options = CURRENCIES.map((currency) => ({
      value: currency.code,
      label: `${currency.code} · ${currency.symbol}`,
    }))
    if (CURRENCIES.some((currency) => currency.code === draft.currency)) return options
    return [{ value: draft.currency, label: draft.currency }, ...options]
  }, [draft.currency])

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <Card title="Defaults">
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Currency"
              value={draft.currency}
              options={currencyOptions}
              onChange={(value) => update('currency', value)}
              hint="Display only — no conversion"
            />
            <NumberField
              label="Account size"
              unit={currencySymbol(draft.currency)}
              value={draft.accountSize}
              onChange={(value) => {
                if (value !== null) update('accountSize', value)
              }}
              min={0}
            />
            <NumberField
              label="Risk per trade"
              unit="%"
              value={draft.riskPercent}
              onChange={(value) => {
                if (value !== null) update('riskPercent', value)
              }}
              min={0}
              max={100}
            />
            <NumberField
              label="Leverage"
              unit="×"
              value={draft.leverage}
              onChange={(value) => {
                if (value !== null) update('leverage', value)
              }}
              min={1}
            />
            <NumberField
              label="Fee per side"
              unit="%"
              value={draft.feePercent}
              onChange={(value) => {
                if (value !== null) update('feePercent', value)
              }}
              min={0}
            />
            <NumberField
              label="Maintenance margin"
              unit="%"
              value={draft.maintenanceMarginPercent}
              onChange={(value) => {
                if (value !== null) update('maintenanceMarginPercent', value)
              }}
              min={0}
            />
            <Field label="Fees in risk" hint="Count fees toward the risk budget">
              <SegmentedControl
                value={draft.feesInRisk ? 'included' : 'excluded'}
                options={[
                  { value: 'included', label: 'Included' },
                  { value: 'excluded', label: 'Excluded' },
                ]}
                onChange={(value) => update('feesInRisk', value === 'included')}
                ariaLabel="Fees in risk"
              />
            </Field>
            <SelectField
              label="Default stats range"
              value={draft.defaultTimeRange}
              options={TIME_RANGES.map((range) => ({ value: range.id, label: range.label }))}
              onChange={(value) => update('defaultTimeRange', value)}
            />
          </div>
        </Card>

        <p className="text-xs text-on-surface-variant">
          These defaults pre-fill the calculators and new journal entries. Changes are saved
          immediately.
        </p>
      </div>
    </ViewportPage>
  )
}

export function PreferencesPage() {
  return (
    <PreferencesGate>
      <PreferencesForm />
    </PreferencesGate>
  )
}
