import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import { setPreferences } from '@/data/repositories/settings.repo'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { routes } from './router'
import { SettingsI18nBridge } from './SettingsI18nBridge'

function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  render(
    <ThemeProvider>
      <SettingsProvider>
        <SettingsI18nBridge>
          <RouterProvider router={router} />
        </SettingsI18nBridge>
      </SettingsProvider>
    </ThemeProvider>,
  )
  return router
}

describe('App', () => {
  it('opens on the Position Size calculator', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Position Size' })).toBeInTheDocument()
    expect(
      await screen.findByText('Fill in entry and stop prices to see results.'),
    ).toBeInTheDocument()
  })

  it('navigates between tabs through the drawer', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('heading', { name: 'Position Size' })

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    await user.click(screen.getByRole('link', { name: 'Journal' }))

    expect(await screen.findByText('No trades yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Journal' })).toBeInTheDocument()
  })

  it('switches subtabs within a tab', async () => {
    const user = userEvent.setup()
    renderApp('/journal/overview')
    await screen.findByText('No trades yet')

    await user.click(screen.getByRole('link', { name: 'Stats' }))
    expect(await screen.findByText('No closed trades in this range')).toBeInTheDocument()
  })

  it('redirects unknown routes to the default calculator', async () => {
    renderApp('/does-not-exist')
    expect(await screen.findByRole('heading', { name: 'Position Size' })).toBeInTheDocument()
  })

  it('renders persian when the stored preference is persian', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'fa' })
    renderApp()
    expect(await screen.findByRole('heading', { name: 'اندازهٔ موقعیت' })).toBeInTheDocument()
    expect(await screen.findByText('دفتر معاملات')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })
})
