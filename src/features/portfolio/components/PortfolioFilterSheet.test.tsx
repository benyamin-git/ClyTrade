import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import {
  DEFAULT_ASSET_FILTERS,
  type AssetFilters,
  type AssetNumericBounds,
} from '../logic/assetFilters'
import { PortfolioFilterSheet } from './PortfolioFilterSheet'

const bounds: AssetNumericBounds = {
  quantity: { min: 0, max: 100 },
  avgCost: { min: 0, max: 100 },
  currentPrice: { min: 0, max: 100 },
  value: { min: 0, max: 10_000 },
  pnl: { min: -1_000, max: 1_000 },
  pnlPercent: { min: -100, max: 100 },
}

function renderSheet(
  overrides: {
    filters?: AssetFilters
    onChange?: (partial: Partial<AssetFilters>) => void
    onReset?: () => void
  } = {},
) {
  const onChange = overrides.onChange ?? vi.fn()
  render(
    <PortfolioFilterSheet
      open
      onClose={() => undefined}
      filters={overrides.filters ?? DEFAULT_ASSET_FILTERS}
      onChange={onChange}
      onReset={overrides.onReset ?? (() => undefined)}
      bounds={bounds}
    />,
    { wrapper: I18nProvider },
  )
  return { onChange }
}

describe('PortfolioFilterSheet', () => {
  it('renders every filter section header', () => {
    renderSheet()

    for (const name of ['Search', 'Market', 'Price & size', 'Performance', 'Outcome', 'Presence']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
  })

  it('starts every section collapsed when nothing is active', () => {
    renderSheet()

    expect(screen.getByRole('button', { name: /Price & size/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByText('Quantity')).not.toBeInTheDocument()
  })

  it('starts an active section open', () => {
    renderSheet({ filters: { ...DEFAULT_ASSET_FILTERS, quantity: { min: 25, max: null } } })

    expect(screen.getByRole('button', { name: /Price & size/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Quantity')).toBeInTheDocument()
  })

  it('reports the live search text through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.click(screen.getByRole('button', { name: /Search/ }))
    await user.type(screen.getByLabelText('Search'), 'b')

    expect(onChange).toHaveBeenLastCalledWith({ search: 'b' })
  })

  it('reports a typed range bound through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.click(screen.getByRole('button', { name: /Price & size/ }))
    const quantity = screen.getByText('Quantity').closest('div') as HTMLElement
    await user.type(within(quantity).getByRole('textbox', { name: 'Min' }), '25')

    expect(onChange).toHaveBeenLastCalledWith({ quantity: { min: 25, max: null } })
  })

  it('renders the outcome options as separate buttons without an All option', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /Outcome/ }))

    expect(screen.getByRole('group', { name: 'Outcome' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gains' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'All outcomes' })).not.toBeInTheDocument()
  })

  it('reports the outcome selection through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.click(screen.getByRole('button', { name: /Outcome/ }))
    await user.click(screen.getByRole('button', { name: 'Gains' }))

    expect(onChange).toHaveBeenLastCalledWith({ outcome: 'gain' })
  })

  it('clears the outcome when the active option is tapped', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet({ filters: { ...DEFAULT_ASSET_FILTERS, outcome: 'loss' } })

    await user.click(screen.getByRole('button', { name: 'Losses' }))

    expect(onChange).toHaveBeenLastCalledWith({ outcome: 'all' })
  })

  it('hides the market search box', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: /Market/ }))

    expect(
      within(screen.getByRole('group', { name: 'Market' })).queryByRole('searchbox'),
    ).not.toBeInTheDocument()
  })

  it('reports the has-price tri-state through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.click(screen.getByRole('button', { name: /Presence/ }))
    const control = screen.getByRole('tablist', { name: 'Has price' })
    await user.click(within(control).getByRole('tab', { name: 'Has' }))

    expect(onChange).toHaveBeenLastCalledWith({ hasPrice: 'has' })
  })

  it('reports the has-notes tri-state through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.click(screen.getByRole('button', { name: /Presence/ }))
    const control = screen.getByRole('tablist', { name: 'Has notes' })
    await user.click(within(control).getByRole('tab', { name: 'Missing' }))

    expect(onChange).toHaveBeenLastCalledWith({ hasNotes: 'missing' })
  })
})
