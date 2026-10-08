import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { MultiSelectField, type MultiSelectOption } from './MultiSelectField'

const options: readonly MultiSelectOption[] = [
  { value: 'stock', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
]

describe('MultiSelectField', () => {
  it('renders a labelled group with a toggle per option and no search field', () => {
    render(<MultiSelectField label="Market" value={[]} options={options} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })

    expect(screen.getByRole('group', { name: 'Market' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stocks' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Crypto' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Forex' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports a single selected value when an option is toggled on', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MultiSelectField label="Market" value={[]} options={options} onChange={onChange} />, {
      wrapper: I18nProvider,
    })

    await user.click(screen.getByRole('button', { name: 'Crypto' }))

    expect(onChange).toHaveBeenCalledWith(['crypto'])
  })

  it('reports multiple selected values in option order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MultiSelectField label="Market" value={['crypto']} options={options} onChange={onChange} />,
      { wrapper: I18nProvider },
    )

    await user.click(screen.getByRole('button', { name: 'Stocks' }))

    expect(onChange).toHaveBeenCalledWith(['stock', 'crypto'])
  })

  it('removes a value when a selected option is toggled off', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MultiSelectField
        label="Market"
        value={['stock', 'crypto']}
        options={options}
        onChange={onChange}
      />,
      { wrapper: I18nProvider },
    )

    await user.click(screen.getByRole('button', { name: 'Stocks' }))

    expect(onChange).toHaveBeenCalledWith(['crypto'])
  })

  it('sizes the option toggles to the control token', () => {
    render(<MultiSelectField label="Market" value={[]} options={options} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })

    expect(screen.getByRole('button', { name: 'Stocks' })).toHaveClass('h-control')
  })

  it('marks a selected option as pressed', () => {
    render(
      <MultiSelectField label="Market" value={['crypto']} options={options} onChange={() => {}} />,
      { wrapper: I18nProvider },
    )

    expect(screen.getByRole('button', { name: 'Crypto' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Stocks' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('hides the visible label while keeping the group accessible name', () => {
    render(
      <MultiSelectField
        label="Market"
        value={[]}
        options={options}
        onChange={() => {}}
        hideLabel
      />,
      { wrapper: I18nProvider },
    )

    expect(screen.getByText('Market')).toHaveClass('sr-only')
    expect(screen.getByRole('group', { name: 'Market' })).toBeInTheDocument()
  })

  it('shows a disabled no-options line when there are no options', () => {
    render(<MultiSelectField label="Market" value={[]} options={[]} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })

    const message = screen.getByText('No options')
    expect(message).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('disables the option toggles when disabled', () => {
    render(
      <MultiSelectField label="Market" value={[]} options={options} onChange={() => {}} disabled />,
      { wrapper: I18nProvider },
    )

    expect(screen.getByRole('button', { name: 'Stocks' })).toBeDisabled()
  })
})
