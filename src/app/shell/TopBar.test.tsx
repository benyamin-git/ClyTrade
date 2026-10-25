import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { TopBar } from './TopBar'

const unreadState = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/features/alerts/logic/useUnreadAlertCount', () => ({
  useUnreadAlertCount: () => unreadState.count,
}))

function renderBar(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar title="Journal" onOpenNav={() => {}} />
    </MemoryRouter>,
    { wrapper: I18nProvider },
  )
}

describe('TopBar', () => {
  beforeEach(() => {
    unreadState.count = 0
  })

  it('shows the unread dot outside the Alerts tab', () => {
    unreadState.count = 2

    renderBar('/journal/overview')

    expect(screen.getByTestId('alerts-unread-dot')).toBeInTheDocument()
  })

  it('hides the unread dot on the Alerts tab', () => {
    unreadState.count = 2

    renderBar('/alerts/overview')

    expect(screen.queryByTestId('alerts-unread-dot')).not.toBeInTheDocument()
  })

  it('hides the unread dot when nothing is unread', () => {
    renderBar('/journal/overview')

    expect(screen.queryByTestId('alerts-unread-dot')).not.toBeInTheDocument()
  })
})
