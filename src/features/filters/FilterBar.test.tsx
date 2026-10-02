import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/i18n/I18nProvider'
import { FilterBar, type FilterBarChip } from './FilterBar'

interface RenderBarOptions {
  chips?: readonly FilterBarChip[]
  activeCount?: number
  onOpenFilters?: () => void
  onClearAll?: () => void
  trailing?: ReactNode
}

function renderBar(options: RenderBarOptions = {}) {
  return render(
    <FilterBar
      chips={options.chips ?? []}
      activeCount={options.activeCount ?? 0}
      onOpenFilters={options.onOpenFilters ?? (() => {})}
      onClearAll={options.onClearAll ?? (() => {})}
      trailing={options.trailing}
    >
      <span>Search</span>
    </FilterBar>,
    { wrapper: I18nProvider },
  )
}

describe('FilterBar', () => {
  it('renders the quick-bar children and trailing content', () => {
    renderBar({ trailing: <span>Add trade</span> })

    expect(screen.getByText('Search')).toBeInTheDocument()
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

  it('calls a chip onClear when its remove control is clicked', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    renderBar({ chips: [{ id: 'open', label: 'Open', onClear }], activeCount: 1 })

    await user.click(screen.getByRole('button', { name: 'Remove Open' }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('renders each chip label', () => {
    renderBar({
      chips: [
        { id: 'open', label: 'Open', onClear: () => {} },
        { id: 'crypto', label: 'Crypto', onClear: () => {} },
      ],
      activeCount: 2,
    })

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Crypto')).toBeInTheDocument()
  })

  it('calls onClearAll when Clear all is clicked', async () => {
    const user = userEvent.setup()
    const onClearAll = vi.fn()
    renderBar({
      chips: [{ id: 'open', label: 'Open', onClear: () => {} }],
      activeCount: 1,
      onClearAll,
    })

    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(onClearAll).toHaveBeenCalledTimes(1)
  })

  it('hides Clear all when nothing is active', () => {
    renderBar({ activeCount: 0 })

    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  })
})
