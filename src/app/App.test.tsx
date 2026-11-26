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
  it('opens on the calculator', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Position Calculator' })).toBeInTheDocument()
    expect(
      await screen.findByText('Enter what you have and leave the rest blank'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Inputs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Results' })).not.toBeInTheDocument()
  })

  it('navigates between tabs through the drawer', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('heading', { name: 'Position Calculator' })

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
    expect(await screen.findByRole('heading', { name: 'Position Calculator' })).toBeInTheDocument()
  })

  it('renders persian when the stored preference is persian', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, language: 'fa' })
    renderApp()
    expect(await screen.findByRole('heading', { name: 'ماشین‌حساب موقعیت' })).toBeInTheDocument()
    expect(await screen.findByText('ژورنال')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })
})
