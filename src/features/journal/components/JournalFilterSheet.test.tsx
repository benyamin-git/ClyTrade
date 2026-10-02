import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import type { TimeRange } from '@/lib/dates'
import {
  DEFAULT_TRADE_FILTERS,
  type TradeFilters,
  type TradeNumericBounds,
} from '../logic/tradeFilters'
import { JournalFilterSheet } from './JournalFilterSheet'

const bounds: TradeNumericBounds = {
  opened: { min: 0, max: 1_000_000 },
  closed: { min: 0, max: 1_000_000 },
  entry: { min: 0, max: 100 },
  exit: { min: 0, max: 100 },
  size: { min: 0, max: 10 },
  leverage: { min: 1, max: 100 },
  fees: { min: 0, max: 10 },
  netPnl: { min: -100, max: 100 },
  rMultiple: { min: -5, max: 5 },
  duration: { min: 0, max: 1_000_000 },
}

function renderSheet(
  overrides: {
    filters?: TradeFilters
    onChange?: (partial: Partial<TradeFilters>) => void
    variant?: 'overview' | 'stats'
    timeRange?: {
      value: TimeRange
      isDefault: boolean
      onChange: (value: TimeRange) => void
    }
  } = {},
) {
  const onChange = overrides.onChange ?? vi.fn()
  render(
    <JournalFilterSheet
      open
      onClose={() => undefined}
      filters={overrides.filters ?? DEFAULT_TRADE_FILTERS}
      onChange={onChange}
      onReset={() => undefined}
      tagOptions={['scalp', 'btc']}
      strategyOptions={['Breakout']}
      bounds={bounds}
      variant={overrides.variant ?? 'overview'}
      timeRange={overrides.timeRange}
    />,
    { wrapper: I18nProvider },
  )
  return { onChange }
}

describe('JournalFilterSheet', () => {
  it('renders every filter section', () => {
    renderSheet()

    for (const name of [
      'Search',
      'Market',
      'Direction',
      'Status',
      'Tags',
      'Strategies',
      'Dates',
      'Price & size',
      'Performance',
      'Outcome',
      'Presence',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
  })

  it('reports a typed range bound through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    const entry = screen.getByText('Entry price').closest('div') as HTMLElement
    await user.type(within(entry).getByRole('textbox', { name: 'Min' }), '25')

    expect(onChange).toHaveBeenLastCalledWith({ entry: { min: 25, max: null } })
  })

  it('reports the live search text through onChange', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSheet()

    await user.type(screen.getByLabelText('Search'), 'b')

    expect(onChange).toHaveBeenLastCalledWith({ search: 'b' })
  })

  it('shows the status and dates sections in the overview variant', () => {
    renderSheet({ variant: 'overview' })

    expect(screen.getByRole('tablist', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dates/ })).toBeInTheDocument()
  })

  it('hides only the status section in the stats variant', () => {
    renderSheet({ variant: 'stats' })

    expect(screen.queryByRole('tablist', { name: 'Status' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Status/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dates/ })).toBeInTheDocument()
  })

  it('renders the time range section in the stats variant when provided', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderSheet({
      variant: 'stats',
      timeRange: { value: '30d', isDefault: true, onChange },
    })

    expect(screen.getByRole('button', { name: /Time range/ })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '7D' }))

    expect(onChange).toHaveBeenCalledWith('7d')
  })

  it('omits the time range section without the prop', () => {
    renderSheet({ variant: 'stats' })

    expect(screen.queryByRole('button', { name: /Time range/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Time range' })).not.toBeInTheDocument()
  })
})
