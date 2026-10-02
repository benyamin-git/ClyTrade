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
  it('renders every filter section', () => {
    renderSheet()

    for (const name of ['Search', 'Market', 'Price & size', 'Performance', 'Outcome', 'Presence']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
  })

  it('reports the live search text through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.type(screen.getByLabelText('Search'), 'b')

    expect(onChange).toHaveBeenLastCalledWith({ search: 'b' })
  })

  it('reports a typed range bound through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    const quantity = screen.getByText('Quantity').closest('div') as HTMLElement
    await user.type(within(quantity).getByRole('textbox', { name: 'Min' }), '25')

    expect(onChange).toHaveBeenLastCalledWith({ quantity: { min: 25, max: null } })
  })

  it('reports the outcome selection through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.click(screen.getByRole('tab', { name: 'Gains' }))

    expect(onChange).toHaveBeenLastCalledWith({ outcome: 'gain' })
  })

  it('reports the has-price tri-state through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    const control = screen.getByRole('tablist', { name: 'Has price' })
    await user.click(within(control).getByRole('tab', { name: 'Has' }))

    expect(onChange).toHaveBeenLastCalledWith({ hasPrice: 'has' })
  })

  it('reports the has-notes tri-state through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    const control = screen.getByRole('tablist', { name: 'Has notes' })
    await user.click(within(control).getByRole('tab', { name: 'Missing' }))

    expect(onChange).toHaveBeenLastCalledWith({ hasNotes: 'missing' })
  })
})
