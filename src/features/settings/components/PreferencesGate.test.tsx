import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import { getPreferences } from '@/data/repositories/settings.repo'
import { I18nProvider } from '@/i18n/I18nProvider'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { PreferencesGate } from './PreferencesGate'

vi.mock('@/data/repositories/settings.repo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/repositories/settings.repo')>()
  return { ...actual, getPreferences: vi.fn() }
})

function renderGate() {
  render(
    <SettingsProvider>
      <I18nProvider>
        <PreferencesGate>
          <div>preferences form</div>
        </PreferencesGate>
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('PreferencesGate', () => {
  it('surfaces a preferences query failure instead of loading forever', async () => {
    vi.mocked(getPreferences).mockRejectedValue(new Error('database unavailable'))

    renderGate()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load preferences.')
    expect(screen.queryByText('preferences form')).not.toBeInTheDocument()
  })

  it('renders its children after a successful load', async () => {
    vi.mocked(getPreferences).mockResolvedValue(DEFAULT_PREFERENCES)

    renderGate()

    expect(await screen.findByText('preferences form')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
