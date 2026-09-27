import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import {
  clearSettings,
  getPreferences,
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
})
