import { useMemo, useState } from 'react'
import type { Preferences } from '@/data/models/settings'
import { usePreferences } from '@/features/settings/SettingsContext'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { useI18n } from '@/i18n/I18nContext'
import { LOCALES } from '@/i18n/locales'
import { CURRENCIES, currencySymbol } from '@/lib/currency'
import { TIME_RANGES } from '@/lib/dates'
import { APP_PLATFORM, APP_VERSION, isPlatformId } from '@/lib/version'
import { Card } from '@/ui/components/Card'
import { Field } from '@/ui/components/Field'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { SelectField } from '@/ui/components/SelectField'
import { ViewportPage } from '@/ui/layout/ViewportPage'

function PreferencesForm() {
  const { preferences, setPreferences } = usePreferences()
  const { t, locale, setLocale } = useI18n()
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

  const platform = isPlatformId(APP_PLATFORM) ? t(`platform.${APP_PLATFORM}`) : APP_PLATFORM

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <Card title={t('preferences.defaults')}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label={t('preferences.currency')}
              value={draft.currency}
              options={currencyOptions}
              onChange={(value) => update('currency', value)}
              hint={t('preferences.currencyHint')}
            />
            <NumberField
              label={t('fields.accountSize')}
              unit={currencySymbol(draft.currency)}
              value={draft.accountSize}
              onChange={(value) => {
                if (value !== null) update('accountSize', value)
              }}
              min={0}
            />
            <NumberField
              label={t('preferences.riskPerTrade')}
              unit="%"
              value={draft.riskPercent}
              onChange={(value) => {
                if (value !== null) update('riskPercent', value)
              }}
              min={0}
              max={100}
            />
            <NumberField
              label={t('fields.leverage')}
              unit="×"
              value={draft.leverage}
              onChange={(value) => {
                if (value !== null) update('leverage', value)
              }}
              min={1}
            />
            <NumberField
              label={t('fields.feePerSide')}
              unit="%"
              value={draft.feePercent}
              onChange={(value) => {
                if (value !== null) update('feePercent', value)
              }}
              min={0}
            />
            <NumberField
              label={t('fields.maintenanceMargin')}
              unit="%"
              value={draft.maintenanceMarginPercent}
              onChange={(value) => {
                if (value !== null) update('maintenanceMarginPercent', value)
              }}
              min={0}
            />
            <Field label={t('preferences.feesInRisk')} hint={t('preferences.feesInRiskHint')}>
              <SegmentedControl
                value={draft.feesInRisk ? 'included' : 'excluded'}
                options={[
                  { value: 'included', label: t('preferences.included') },
                  { value: 'excluded', label: t('preferences.excluded') },
                ]}
                onChange={(value) => update('feesInRisk', value === 'included')}
                ariaLabel={t('preferences.feesInRisk')}
              />
            </Field>
            <SelectField
              label={t('preferences.defaultStatsRange')}
              value={draft.defaultTimeRange}
              options={TIME_RANGES.map((id) => ({ value: id, label: t(`timeRange.${id}`) }))}
              onChange={(value) => update('defaultTimeRange', value)}
            />
          </div>
        </Card>

        <Card title={t('preferences.interface')}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label={t('preferences.language')}
              value={locale}
              options={LOCALES.map((item) => ({ value: item.id, label: item.label }))}
              onChange={setLocale}
              hint={t('preferences.languageHint')}
            />
          </div>
        </Card>

        <p className="text-xs text-on-surface-variant">{t('preferences.footerNote')}</p>

        <p className="text-xs text-on-surface-variant">
          ClyTrade {APP_VERSION} · {platform}
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
