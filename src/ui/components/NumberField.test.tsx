import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberField, type NumberUnitOption } from './NumberField'

const unitOptions: readonly NumberUnitOption[] = [
  { value: 'percent', label: '%' },
  { value: 'currency', label: '$' },
]

describe('NumberField', () => {
  it('re-displays the value when the unit changes', () => {
    const { rerender } = render(
      <NumberField
        label="Risk"
        value={1}
        onChange={() => {}}
        unitOptions={unitOptions}
        unitValue="percent"
        onUnitChange={() => {}}
      />,
    )
    expect(screen.getByLabelText('Risk')).toHaveValue('1')

    rerender(
      <NumberField
        label="Risk"
        value={10}
        onChange={() => {}}
        unitOptions={unitOptions}
        unitValue="currency"
        onUnitChange={() => {}}
      />,
    )

    expect(screen.getByLabelText('Risk')).toHaveValue('10')
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('reports the selected unit', async () => {
    const user = userEvent.setup()
    const onUnitChange = vi.fn()
    render(
      <NumberField
        label="Risk"
        value={1}
        onChange={() => {}}
        unitOptions={unitOptions}
        unitValue="percent"
        onUnitChange={onUnitChange}
      />,
    )

    await user.click(screen.getByRole('tab', { name: '$' }))
    expect(onUnitChange).toHaveBeenCalledWith('currency')
  })
})
