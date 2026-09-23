import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { routes } from './router'

function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  render(
    <ThemeProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
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
})
