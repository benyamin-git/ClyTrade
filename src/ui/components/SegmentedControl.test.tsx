import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

const options = [
  { value: 'all', label: 'All' },
  { value: 'win', label: 'Win' },
] as const

describe('SegmentedControl', () => {
  it('renders options and reports the selected value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedControl value="all" options={options} onChange={onChange} ariaLabel="Outcome" />,
    )

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Win' })).toHaveAttribute('aria-selected', 'false')

    await user.click(screen.getByRole('tab', { name: 'Win' }))
    expect(onChange).toHaveBeenCalledWith('win')
  })

  it('wraps options when full width', () => {
    render(<SegmentedControl value="all" options={options} onChange={() => {}} fullWidth />)

    expect(screen.getByRole('tablist')).toHaveClass('w-full', 'flex-wrap')
  })

  it('does not stretch by default', () => {
    render(<SegmentedControl value="all" options={options} onChange={() => {}} />)

    expect(screen.getByRole('tablist')).not.toHaveClass('w-full')
  })
})
