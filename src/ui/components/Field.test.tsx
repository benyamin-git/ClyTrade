import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'

describe('Field', () => {
  it('associates the error with the control', () => {
    render(
      <Field label="Leverage" htmlFor="leverage" error="Must be at most 100">
        {({ describedBy, invalid }) => (
          <input
            id="leverage"
            aria-describedby={describedBy}
            aria-invalid={invalid ? true : undefined}
          />
        )}
      </Field>,
    )

    const input = screen.getByLabelText('Leverage')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Must be at most 100')
  })

  it('associates the hint when there is no error', () => {
    render(
      <Field label="Leverage" htmlFor="leverage" hint="Between 1 and 100">
        {({ describedBy, invalid }) => (
          <input
            id="leverage"
            aria-describedby={describedBy}
            aria-invalid={invalid ? true : undefined}
          />
        )}
      </Field>,
    )

    const input = screen.getByLabelText('Leverage')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).toHaveAccessibleDescription('Between 1 and 100')
  })

  it('prefers the error over the hint', () => {
    render(
      <Field label="Leverage" htmlFor="leverage" hint="Between 1 and 100" error="Out of range">
        {({ describedBy, invalid }) => (
          <input
            id="leverage"
            aria-describedby={describedBy}
            aria-invalid={invalid ? true : undefined}
          />
        )}
      </Field>,
    )

    const input = screen.getByLabelText('Leverage')
    expect(input).toHaveAccessibleDescription('Out of range')
    expect(screen.queryByText('Between 1 and 100')).not.toBeInTheDocument()
  })
})
