import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import { DEFAULT_PREFERENCES, PREFERENCES_KEY } from '@/data/models/settings'
import {
  clearSettings,
  getPreferences,
  getSetting,
  setPreferences,
} from '@/data/repositories/settings.repo'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { PreferencesPage } from './PreferencesPage'

function renderPage() {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesPage />
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('PreferencesPage', () => {
  beforeEach(async () => {
    await clearSettings()
  })

  it('keeps the selected language when the currency changes', async () => {
    const user = userEvent.setup()
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'fa' })
    renderPage()

    await user.selectOptions(await screen.findByLabelText('زبان'), 'en')
    await waitFor(async () => {
      expect((await getPreferences()).language).toBe('en')
    })

    await user.selectOptions(await screen.findByLabelText('Currency'), 'EUR')

    expect(await screen.findByText('Defaults')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    await waitFor(async () => {
      const stored = await getPreferences()
      expect(stored.currency).toBe('EUR')
      expect(stored.language).toBe('en')
    })
  })

  it('persists the default market', async () => {
    const user = userEvent.setup()
    await setPreferences(DEFAULT_PREFERENCES)
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Default market'), 'forex')

    await waitFor(async () => {
      expect((await getPreferences()).defaultMarket).toBe('forex')
    })
  })

  it('clamps a below-minimum number before persisting and keeps the other fields', async () => {
    const user = userEvent.setup()
    await setPreferences({ ...DEFAULT_PREFERENCES, currency: 'EUR', language: 'en' })
    renderPage()

    const leverage = await screen.findByLabelText('Leverage')
    await user.clear(leverage)
    await user.type(leverage, '0')

    await waitFor(async () => {
      const stored = await getSetting<{ currency: string; leverage: number }>(PREFERENCES_KEY)
      expect(stored?.leverage).toBe(1)
      expect(stored?.currency).toBe('EUR')
    })
  })

  it('clamps an above-maximum number before persisting', async () => {
    const user = userEvent.setup()
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
    renderPage()

    const risk = await screen.findByLabelText('Risk per trade')
    await user.clear(risk)
    await user.type(risk, '150')

    await waitFor(async () => {
      const stored = await getSetting<{ riskPercent: number }>(PREFERENCES_KEY)
      expect(stored?.riskPercent).toBe(100)
    })
  })
})
