import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { tabs } from '@/navigation/tabs'
import { NavDrawer } from './NavDrawer'

function renderDrawer(open: boolean, onClose = () => {}) {
  const { container } = render(
    <MemoryRouter>
      <NavDrawer open={open} onClose={onClose} />
    </MemoryRouter>,
    { wrapper: I18nProvider },
  )
  const root = container.firstElementChild
  if (!(root instanceof HTMLElement)) throw new Error('drawer root not rendered')
  return { root }
}

describe('NavDrawer', () => {
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
