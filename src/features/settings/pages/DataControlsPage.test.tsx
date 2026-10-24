import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_APP_ID, BACKUP_SCHEMA_VERSION } from '@/data/backup'
import { PREFERENCES_KEY } from '@/data/models/settings'
import { clearSettings, getSetting, setSetting } from '@/data/repositories/settings.repo'
import { I18nProvider } from '@/i18n/I18nProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { DataControlsPage } from './DataControlsPage'

const { clearAllDataMock } = vi.hoisted(() => ({ clearAllDataMock: vi.fn() }))

vi.mock('@/data/backup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/backup')>()
  return { ...actual, clearAllData: clearAllDataMock }
})

function renderPage() {
  render(
    <ThemeProvider>
      <I18nProvider>
        <DataControlsPage />
      </I18nProvider>
    </ThemeProvider>,
  )
}

function backupWithUi(ui: { theme: string; accent: string }): File {
  return new File(
    [
      JSON.stringify({
        app: BACKUP_APP_ID,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: '2026-01-01T00:00:00.000Z',
        data: { trades: [], assets: [], settings: [], ui },
      }),
    ],
    'backup.json',
    { type: 'application/json' },
  )
}

describe('DataControlsPage', () => {
  beforeEach(async () => {
    clearAllDataMock.mockReset()
    await clearSettings()
  })

  it('names the import mode control', () => {
    renderPage()

    expect(screen.getByRole('radiogroup', { name: 'Import mode' })).toBeInTheDocument()
  })

  it('clears all data and shows a confirmation', async () => {
    const actual = await vi.importActual<typeof import('@/data/backup')>('@/data/backup')
    clearAllDataMock.mockImplementation(actual.clearAllData)
    await setSetting(PREFERENCES_KEY, { currency: 'EUR' })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset all data' }))
    await user.click(screen.getByRole('button', { name: 'Delete everything' }))

    expect(await screen.findByText('All data cleared.')).toBeInTheDocument()
    await waitFor(async () => {
      expect(await getSetting(PREFERENCES_KEY)).toBeUndefined()
    })
  })

  it('shows an error and closes the confirmation when the reset fails', async () => {
    clearAllDataMock.mockRejectedValue(new Error('reset failed'))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset all data' }))
    await user.click(screen.getByRole('button', { name: 'Delete everything' }))

    expect(await screen.findByText('Could not clear all data.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete everything' })).not.toBeInTheDocument()
  })

  it('applies the theme and accent from a backup', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, backupWithUi({ theme: 'light', accent: 'rose' }))

    expect(await screen.findByText('Imported 0 trades and 0 assets (Merge).')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light')
      expect(document.documentElement.dataset.accent).toBe('rose')
    })
  })

  it('disables the confirmation while the reset is running', async () => {
    let resolveReset: () => void = () => undefined
    clearAllDataMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReset = resolve
        }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset all data' }))
    const confirm = screen.getByRole('button', { name: 'Delete everything' })
    await user.click(confirm)

    expect(confirm).toBeDisabled()

    await act(async () => {
      resolveReset()
    })
    expect(await screen.findByText('All data cleared.')).toBeInTheDocument()
  })
})
