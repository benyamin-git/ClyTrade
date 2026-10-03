import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/i18n/I18nProvider'
import { FilterBar } from './FilterBar'

interface RenderBarOptions {
  activeCount?: number
  onOpenFilters?: () => void
  trailing?: ReactNode
  leading?: ReactNode
}

function renderBar(options: RenderBarOptions = {}) {
  return render(
    <FilterBar
      activeCount={options.activeCount ?? 0}
      onOpenFilters={options.onOpenFilters ?? (() => {})}
      trailing={options.trailing}
      leading={options.leading}
    />,
    { wrapper: I18nProvider },
  )
}

describe('FilterBar', () => {
  it('renders the Filters button plus leading and trailing content', () => {
    renderBar({ leading: <span>7D</span>, trailing: <span>Add trade</span> })

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByText('7D')).toBeInTheDocument()
    expect(screen.getByText('Add trade')).toBeInTheDocument()
  })

  it('hides the badge when nothing is active', () => {
    renderBar({ activeCount: 0 })

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows the active count in the badge', () => {
    renderBar({ activeCount: 3 })

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onOpenFilters when the Filters button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenFilters = vi.fn()
    renderBar({ onOpenFilters })

    await user.click(screen.getByRole('button', { name: 'Filters' }))

    expect(onOpenFilters).toHaveBeenCalledTimes(1)
  })
})
