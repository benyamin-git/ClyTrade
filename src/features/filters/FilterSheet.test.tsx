import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { FilterSheet, type FilterSectionSpec } from './FilterSheet'

function makeSections(): FilterSectionSpec[] {
  return [
    { id: 'market', title: 'Market', count: 2, children: <p>Market body</p> },
    { id: 'tags', title: 'Tags', count: 0, children: <p>Tags body</p> },
  ]
}

function renderSheet(
  overrides: {
    open?: boolean
    onClose?: () => void
    sections?: readonly FilterSectionSpec[]
    onClearAll?: () => void
  } = {},
) {
  return render(
    <FilterSheet
      open={overrides.open ?? true}
      onClose={overrides.onClose ?? (() => {})}
      sections={overrides.sections ?? makeSections()}
      onClearAll={overrides.onClearAll ?? (() => {})}
    />,
    { wrapper: I18nProvider },
  )
}

describe('FilterSheet', () => {
  it('renders the sheet title', () => {
    renderSheet()

    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('renders every section with its count and children', () => {
    renderSheet()

    expect(screen.getByRole('button', { name: /Market/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tags/ })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Market body')).toBeInTheDocument()
    expect(screen.getByText('Tags body')).toBeInTheDocument()
  })

  it('collapses a section when its header is clicked', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /Market/ }))

    expect(screen.queryByText('Market body')).not.toBeInTheDocument()
    expect(screen.getByText('Tags body')).toBeInTheDocument()
  })

  it('calls onClearAll when Clear all is clicked', async () => {
    const user = userEvent.setup()
    const onClearAll = vi.fn()
    renderSheet({ onClearAll })

    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(onClearAll).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Done is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderSheet({ onClose })

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when closed', () => {
    renderSheet({ open: false })

    expect(screen.queryByText('Filters')).not.toBeInTheDocument()
  })
})
