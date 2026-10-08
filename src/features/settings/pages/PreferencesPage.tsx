import { useMemo } from 'react'
import { MARKET_IDS } from '@/data/models/market'
import { PREFERENCE_LIMITS, type BoundedPreference } from '@/data/models/settings'
import { usePreferences } from '@/features/settings/SettingsContext'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { useI18n } from '@/i18n/I18nContext'
import { LOCALES } from '@/i18n/locales'
import { CURRENCIES, currencySymbol } from '@/lib/currency'
import { TIME_RANGES } from '@/lib/dates'
import { clamp } from '@/lib/money'
import { APP_PLATFORM, APP_VERSION, isPlatformId } from '@/lib/version'
import { Card } from '@/ui/components/Card'
import { Field } from '@/ui/components/Field'
import { NumberField } from '@/ui/components/NumberField'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { SelectField } from '@/ui/components/SelectField'
import { ViewportPage } from '@/ui/layout/ViewportPage'

function clampPreference(key: BoundedPreference, value: number): number {
  const limits = PREFERENCE_LIMITS[key]
  return clamp(value, limits.min, limits.max)
}

function PreferencesForm() {
  const { preferences, updatePreferences } = usePreferences()
  const { t, locale, setLocale } = useI18n()

  const currencyOptions = useMemo(() => {
    const options = CURRENCIES.map((currency) => ({
      value: currency.code,
      label: `${currency.code} · ${currency.symbol}`,
    }))
    if (CURRENCIES.some((currency) => currency.code === preferences.currency)) return options
    return [{ value: preferences.currency, label: preferences.currency }, ...options]
  }, [preferences.currency])

  const platform = isPlatformId(APP_PLATFORM) ? t(`platform.${APP_PLATFORM}`) : APP_PLATFORM

  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <Card title={t('preferences.defaults')}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label={t('preferences.currency')}
              value={preferences.currency}
              options={currencyOptions}
              onChange={(value) => updatePreferences({ currency: value })}
              hint={t('preferences.currencyHint')}
            />
            <SelectField
              label={t('preferences.defaultMarket')}
              value={preferences.defaultMarket}
              options={MARKET_IDS.map((id) => ({ value: id, label: t(`markets.${id}`) }))}
              onChange={(value) => updatePreferences({ defaultMarket: value })}
              hint={t('preferences.defaultMarketHint')}
            />
            <NumberField
              label={t('fields.accountSize')}
              unit={currencySymbol(preferences.currency)}
              value={preferences.accountSize}
              onChange={(value) => {
                if (value !== null) {
                  updatePreferences({ accountSize: clampPreference('accountSize', value) })
                }
              }}
              min={PREFERENCE_LIMITS.accountSize.min}
            />
            <NumberField
              label={t('preferences.riskPerTrade')}
              unit="%"
              value={preferences.riskPercent}
              onChange={(value) => {
                if (value !== null) {
                  updatePreferences({ riskPercent: clampPreference('riskPercent', value) })
                }
              }}
              min={PREFERENCE_LIMITS.riskPercent.min}
              max={PREFERENCE_LIMITS.riskPercent.max}
            />
            <NumberField
              label={t('fields.leverage')}
              unit="×"
              value={preferences.leverage}
              onChange={(value) => {
                if (value !== null) {
                  updatePreferences({ leverage: clampPreference('leverage', value) })
                }
              }}
              min={PREFERENCE_LIMITS.leverage.min}
            />
            <NumberField
              label={t('fields.feePerSide')}
              unit="%"
              value={preferences.feePercent}
              onChange={(value) => {
                if (value !== null) {
                  updatePreferences({ feePercent: clampPreference('feePercent', value) })
                }
              }}
              min={PREFERENCE_LIMITS.feePercent.min}
            />
            <NumberField
              label={t('fields.maintenanceMargin')}
              unit="%"
              value={preferences.maintenanceMarginPercent}
              onChange={(value) => {
                if (value !== null) {
                  updatePreferences({
                    maintenanceMarginPercent: clampPreference('maintenanceMarginPercent', value),
                  })
                }
              }}
              min={PREFERENCE_LIMITS.maintenanceMarginPercent.min}
              max={PREFERENCE_LIMITS.maintenanceMarginPercent.max}
            />
            <Field label={t('preferences.feesInRisk')} hint={t('preferences.feesInRiskHint')}>
              <SegmentedControl
                value={preferences.feesInRisk ? 'included' : 'excluded'}
                options={[
                  { value: 'included', label: t('preferences.included') },
                  { value: 'excluded', label: t('preferences.excluded') },
                ]}
                onChange={(value) => updatePreferences({ feesInRisk: value === 'included' })}
                ariaLabel={t('preferences.feesInRisk')}
              />
            </Field>
            <SelectField
              label={t('preferences.defaultStatsRange')}
              value={preferences.defaultTimeRange}
              options={TIME_RANGES.map((id) => ({ value: id, label: t(`timeRange.${id}`) }))}
              onChange={(value) => updatePreferences({ defaultTimeRange: value })}
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
