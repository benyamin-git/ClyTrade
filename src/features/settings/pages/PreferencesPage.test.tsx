import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import { exportBackup } from '@/data/backup'
import { DEFAULT_PREFERENCES, MARKET_API_KEY, PREFERENCES_KEY } from '@/data/models/settings'
import {
  clearSettings,
  getMarketApiKey,
  getPreferences,
  getSetting,
  setMarketApiKey,
  setPreferences,
} from '@/data/repositories/settings.repo'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { PreferencesPage } from './PreferencesPage'

const platform = vi.hoisted(() => ({ current: 'web' as string }))

vi.mock('@/lib/version', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/version')>()
  return {
    ...actual,
    get APP_PLATFORM() {
      return platform.current
    },
  }
})

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
    platform.current = 'web'
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

  it('persists the provider, auto-close default and key without exporting the key', async () => {
    const user = userEvent.setup()
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Price provider'), 'coingecko')
    await waitFor(async () => {
      expect((await getPreferences()).priceProvider).toBe('coingecko')
    })

    const key = await screen.findByLabelText('CoinGecko API key')
    await user.type(key, 'demo-key')
    await user.tab()
    await waitFor(async () => {
      expect(await getMarketApiKey()).toBe('demo-key')
    })

    const autoClose = screen.getByRole('radiogroup', { name: 'Auto-close new trades' })
    await user.click(within(autoClose).getByRole('radio', { name: 'Included' }))
    await waitFor(async () => {
      expect((await getPreferences()).autoCloseByDefault).toBe(true)
    })

    const backup = await exportBackup()
    expect(backup.data.settings.some((row) => row.key === MARKET_API_KEY)).toBe(false)
  })

  it('loads and clears a saved key', async () => {
    const user = userEvent.setup()
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
    await setMarketApiKey('saved-key')
    renderPage()

    await screen.findByLabelText('CoinGecko API key')
    await waitFor(() => {
      expect(screen.getByLabelText('CoinGecko API key')).toHaveValue('saved-key')
    })

    await user.click(screen.getByRole('button', { name: 'Clear key' }))

    await waitFor(async () => {
      expect(await getMarketApiKey()).toBeNull()
    })
    expect(screen.getByLabelText('CoinGecko API key')).toHaveValue('')
  })

  it('shows the Windows close behavior and persists the choice', async () => {
    platform.current = 'windows'
    const user = userEvent.setup()
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
    renderPage()

    await user.selectOptions(await screen.findByLabelText('When closing'), 'tray')

    await waitFor(async () => {
      expect((await getPreferences()).windowsCloseBehavior).toBe('tray')
    })
  })

  it('shows the Windows close behavior select only once', async () => {
    platform.current = 'windows'
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
    renderPage()

    await screen.findByText('Defaults')

    expect(screen.getAllByLabelText('When closing')).toHaveLength(1)
  })

  it('hides the Windows close behavior off Windows', async () => {
    platform.current = 'web'
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
    renderPage()

    await screen.findByText('Defaults')

    expect(screen.queryByLabelText('When closing')).not.toBeInTheDocument()
  })

  it('toggles key visibility', async () => {
    const user = userEvent.setup()
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'en' })
    await setMarketApiKey('saved-key')
    renderPage()

    await screen.findByLabelText('CoinGecko API key')
    await waitFor(() => {
      expect(screen.getByLabelText('CoinGecko API key')).toHaveValue('saved-key')
    })
    expect(screen.getByLabelText('CoinGecko API key')).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show key' }))

    await waitFor(() => {
      expect(screen.getByLabelText('CoinGecko API key')).toHaveAttribute('type', 'text')
    })
  })
})
