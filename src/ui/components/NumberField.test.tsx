import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
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
      { wrapper: I18nProvider },
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

  it('associates an error with the input', () => {
    render(
      <NumberField
        label="Risk"
        value={1}
        onChange={() => {}}
        error="Must be at least 10"
        min={10}
      />,
      { wrapper: I18nProvider },
    )

    const input = screen.getByLabelText('Risk')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Must be at least 10')
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
      { wrapper: I18nProvider },
    )

    const toggle = screen.getByRole('button', { name: 'Switch Risk unit (currently %)' })
    expect(toggle).toHaveTextContent('%')

    await user.click(toggle)
    expect(onUnitChange).toHaveBeenCalledWith('currency')
  })

  it('resets unparseable blur text to the controlled value', async () => {
    const user = userEvent.setup()
    render(<NumberField label="Risk" value={5} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })
    const input = screen.getByLabelText('Risk')

    await user.clear(input)
    await user.type(input, 'abc')
    expect(input).toHaveValue('abc')

    await user.tab()
    expect(input).toHaveValue('5')
  })

  it('renders an empty field for a non-finite value', () => {
    render(<NumberField label="Risk" value={Number.POSITIVE_INFINITY} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })

    expect(screen.getByLabelText('Risk')).toHaveValue('')
  })

  it('syncs the display when the value prop changes externally', () => {
    const { rerender } = render(<NumberField label="Risk" value={1} onChange={() => {}} />, {
      wrapper: I18nProvider,
    })
    expect(screen.getByLabelText('Risk')).toHaveValue('1')

    rerender(<NumberField label="Risk" value={42} onChange={() => {}} />)

    expect(screen.getByLabelText('Risk')).toHaveValue('42')
  })

  it('keeps in-progress text while the parent echoes the parsed value', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [value, setValue] = useState<number | null>(null)
      return <NumberField label="Risk" value={value} onChange={setValue} />
    }
    render(<Controlled />, { wrapper: I18nProvider })

    await user.type(screen.getByLabelText('Risk'), '1.50')
    expect(screen.getByLabelText('Risk')).toHaveValue('1.50')
  })
})
