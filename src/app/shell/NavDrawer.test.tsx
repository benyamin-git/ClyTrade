import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AlertEventDraft, AlertEventStatus } from '@/data/models/price'
import {
  clearAlertEvents,
  createAlertEvent,
  markAllAlertEventsRead,
} from '@/data/repositories/alerts.repo'
import { I18nProvider } from '@/i18n/I18nProvider'
import { tabs } from '@/navigation/tabs'
import { NavDrawer } from './NavDrawer'

function eventDraft(at: number, status: AlertEventStatus = 'unread'): AlertEventDraft {
  return {
    kind: 'level',
    tradeId: null,
    ruleId: null,
    symbol: 'BTC',
    price: 70000,
    level: 70000,
    targetPrice: null,
    stopPrice: null,
    at,
    provider: 'binance',
    status,
    resolution: null,
    readAt: status === 'read' ? at : null,
  }
}

function renderDrawer(open: boolean, onClose = () => {}, initialPath = '/') {
  const { container } = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavDrawer open={open} onClose={onClose} />
    </MemoryRouter>,
    { wrapper: I18nProvider },
  )
  const root = container.firstElementChild
  if (!(root instanceof HTMLElement)) throw new Error('drawer root not rendered')
  return { root }
}

describe('NavDrawer', () => {
  beforeEach(async () => {
    await clearAlertEvents()
  })

  it('removes the closed drawer from focus and assistive tech', () => {
    const { root } = renderDrawer(false)

    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).toHaveAttribute('inert')
  })

  it('exposes the navigation and its links when open', () => {
    const { root } = renderDrawer(true)

    expect(root).not.toHaveAttribute('aria-hidden')
    expect(root).not.toHaveAttribute('inert')
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(tabs.length)
  })

  it('marks the tab active on a non-first subtab', () => {
    renderDrawer(true, () => {}, '/settings/data')

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Journal' })).not.toHaveAttribute('aria-current')
  })

  it('shows the Alerts tab with the unread count', async () => {
    await createAlertEvent(eventDraft(1))
    await createAlertEvent(eventDraft(2))
    await createAlertEvent(eventDraft(3, 'read'))

    renderDrawer(true)

    const alerts = await screen.findByRole('link', { name: 'Alerts, 2 unread alerts' })
    expect(within(alerts).getByText('2')).toBeInTheDocument()
  })

  it('drops the Alerts badge when every event is marked read', async () => {
    await createAlertEvent(eventDraft(1))

    renderDrawer(true)
    expect(await screen.findByRole('link', { name: 'Alerts, 1 unread alert' })).toBeInTheDocument()

    await act(async () => {
      await markAllAlertEventsRead()
    })

    const alerts = await screen.findByRole('link', { name: 'Alerts' })
    expect(within(alerts).queryByText('1')).not.toBeInTheDocument()
  })

  it('moves focus into the drawer and traps tab focus', async () => {
    const user = userEvent.setup()
    renderDrawer(true)

    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus()
  })

  it('restores focus to the opener when closed', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <MemoryRouter>
          <button type="button" onClick={() => setOpen(true)}>
            Open navigation
          </button>
          <NavDrawer open={open} onClose={() => setOpen(false)} />
        </MemoryRouter>
      )
    }
    render(<Harness />, { wrapper: I18nProvider })

    const opener = screen.getByRole('button', { name: 'Open navigation' })
    await user.click(opener)
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })
})
