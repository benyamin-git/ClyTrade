import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { RangeField, type RangeFieldProps } from './RangeField'

function renderField(props: RangeFieldProps) {
  return render(<RangeField {...props} />, { wrapper: I18nProvider })
}

const base: RangeFieldProps = {
  label: 'Price',
  value: { min: null, max: null },
  onChange: () => {},
  min: 0,
  max: 100,
}

describe('RangeField', () => {
  it('renders two number inputs and no slider', () => {
    renderField(base)

    expect(screen.getByRole('textbox', { name: 'Min' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Max' })).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('labels the min/max group with the field label', () => {
    renderField(base)

    expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument()
  })

  it('reports a typed minimum and maximum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderField({ ...base, onChange })

    await user.type(screen.getByRole('textbox', { name: 'Min' }), '25')
    expect(onChange).toHaveBeenLastCalledWith({ min: 25, max: null })

    await user.type(screen.getByRole('textbox', { name: 'Max' }), '80')
    expect(onChange).toHaveBeenLastCalledWith({ min: null, max: 80 })
  })

  it('reports null when a typed bound is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderField({ ...base, value: { min: 25, max: 80 }, onChange })

    await user.clear(screen.getByRole('textbox', { name: 'Max' }))

    expect(onChange).toHaveBeenLastCalledWith({ min: 25, max: null })
  })

  it('does not clamp a typed maximum below the minimum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderField({ ...base, value: { min: 80, max: 90 }, onChange })

    const maxInput = screen.getByRole('textbox', { name: 'Max' })
    await user.clear(maxInput)
    await user.type(maxInput, '10')

    expect(onChange).toHaveBeenLastCalledWith({ min: 80, max: 10 })
  })

  it('reflects an external value change in the typed inputs', () => {
    const { rerender } = renderField(base)

    rerender(<RangeField {...base} value={{ min: 25, max: 80 }} />)
    expect(screen.getByRole('textbox', { name: 'Min' })).toHaveValue('25')
    expect(screen.getByRole('textbox', { name: 'Max' })).toHaveValue('80')

    rerender(<RangeField {...base} value={{ min: null, max: null }} />)
    expect(screen.getByRole('textbox', { name: 'Min' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Max' })).toHaveValue('')
  })

  it('disables both inputs and shows the hint for a degenerate domain', () => {
    renderField({ ...base, min: 5, max: 5, hint: 'Range unavailable' })

    expect(screen.getByRole('textbox', { name: 'Min' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Max' })).toBeDisabled()
    expect(screen.getByText('Range unavailable')).toBeInTheDocument()
  })

  it('shows the default note for a degenerate domain without a hint', () => {
    renderField({ ...base, min: 5, max: 5 })

    expect(screen.getByText('No range available')).toBeInTheDocument()
  })

  it('uses the formatter for the input placeholders', () => {
    renderField({ ...base, min: 10, max: 90, format: (value) => `$${value}` })

    expect(screen.getByRole('textbox', { name: 'Min' })).toHaveAttribute('placeholder', '$10')
    expect(screen.getByRole('textbox', { name: 'Max' })).toHaveAttribute('placeholder', '$90')
  })
})
