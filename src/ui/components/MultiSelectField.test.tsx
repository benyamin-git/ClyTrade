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
  it('renders a labelled group with a checkbox per option and no search field', () => {
    render(<MultiSelectField label="Market" value={[]} options={options} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })

    expect(screen.getByRole('group', { name: 'Market' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Stocks' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Crypto' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Forex' })).not.toBeChecked()
  })

  it('reports a single selected value when an option is toggled on', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MultiSelectField label="Market" value={[]} options={options} onChange={onChange} />, {
      wrapper: I18nProvider,
    })

    await user.click(screen.getByRole('checkbox', { name: 'Crypto' }))

    expect(onChange).toHaveBeenCalledWith(['crypto'])
  })

  it('reports multiple selected values in option order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MultiSelectField label="Market" value={['crypto']} options={options} onChange={onChange} />,
      { wrapper: I18nProvider },
    )

    await user.click(screen.getByRole('checkbox', { name: 'Stocks' }))

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

    await user.click(screen.getByRole('checkbox', { name: 'Stocks' }))

    expect(onChange).toHaveBeenCalledWith(['crypto'])
  })

  it('shows a disabled no-options line when there are no options', () => {
    render(<MultiSelectField label="Market" value={[]} options={[]} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })

    const message = screen.getByText('No options')
    expect(message).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('disables the option rows when disabled', () => {
    render(
      <MultiSelectField label="Market" value={[]} options={options} onChange={() => {}} disabled />,
      { wrapper: I18nProvider },
    )

    expect(screen.getByRole('checkbox', { name: 'Stocks' })).toBeDisabled()
  })
})
