import { fireEvent, render, screen } from '@testing-library/react'
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
  it('labels both slider handles and both number inputs', () => {
    renderField(base)

    expect(screen.getByRole('slider', { name: 'Min' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Max' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Min' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Max' })).toBeInTheDocument()
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

  it('does not force a typed maximum below the minimum', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderField({ ...base, value: { min: 80, max: 90 }, onChange })

    const maxInput = screen.getByRole('textbox', { name: 'Max' })
    await user.clear(maxInput)
    await user.type(maxInput, '10')

    expect(onChange).toHaveBeenLastCalledWith({ min: 80, max: 10 })
  })

  it('keeps the slider handles ordered', () => {
    const onChange = vi.fn()
    renderField({ ...base, value: { min: 20, max: 40 }, onChange })

    fireEvent.change(screen.getByRole('slider', { name: 'Min' }), { target: { value: '0.9' } })
    expect(onChange).toHaveBeenLastCalledWith({ min: 40, max: 40 })

    fireEvent.change(screen.getByRole('slider', { name: 'Max' }), { target: { value: '0.1' } })
    expect(onChange).toHaveBeenLastCalledWith({ min: 20, max: 20 })
  })

  it('disables the field and shows the hint for a degenerate domain', () => {
    renderField({ ...base, min: 5, max: 5, hint: 'Range unavailable' })

    expect(screen.getByRole('slider', { name: 'Min' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Max' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Min' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Max' })).toBeDisabled()
    expect(screen.getByText('Range unavailable')).toBeInTheDocument()
  })
})
