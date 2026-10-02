import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders a labelled checkbox reflecting the checked prop', () => {
    render(<Checkbox label="Stocks" checked onChange={() => {}} />)

    const checkbox = screen.getByLabelText('Stocks')
    expect(checkbox).toBeChecked()
    expect(checkbox).toHaveAttribute('type', 'checkbox')
  })

  it('reports the next checked state when toggled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Stocks" checked={false} onChange={onChange} />)

    await user.click(screen.getByLabelText('Stocks'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('can be disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Stocks" checked={false} onChange={onChange} disabled />)

    const checkbox = screen.getByLabelText('Stocks')
    expect(checkbox).toBeDisabled()
    await user.click(checkbox)
    expect(onChange).not.toHaveBeenCalled()
  })
})
