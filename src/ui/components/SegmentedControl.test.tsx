import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

const options = [
  { value: 'all', label: 'All' },
  { value: 'win', label: 'Win' },
] as const

const threeOptions = [
  { value: 'all', label: 'All' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
] as const

function OutcomeControl() {
  const [value, setValue] = useState<'all' | 'win'>('all')
  return (
    <SegmentedControl value={value} options={options} onChange={setValue} ariaLabel="Outcome" />
  )
}

function SeparatedOutcomeControl() {
  const [value, setValue] = useState<'all' | 'win' | 'loss'>('all')
  return (
    <SegmentedControl
      value={value}
      options={threeOptions}
      onChange={setValue}
      variant="separated"
      ariaLabel="Outcome"
    />
  )
}

describe('SegmentedControl', () => {
  it('renders options and reports the selected value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedControl value="all" options={options} onChange={onChange} ariaLabel="Outcome" />,
    )

    expect(screen.getByRole('radiogroup', { name: 'Outcome' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Win' })).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByRole('radio', { name: 'Win' }))
    expect(onChange).toHaveBeenCalledWith('win')
  })

  it('wraps options when full width', () => {
    render(<SegmentedControl value="all" options={options} onChange={() => {}} fullWidth />)

    expect(screen.getByRole('radiogroup')).toHaveClass('w-full', 'flex-wrap')
  })

  it('does not stretch by default', () => {
    render(<SegmentedControl value="all" options={options} onChange={() => {}} />)

    expect(screen.getByRole('radiogroup')).not.toHaveClass('w-full')
  })

  it('sizes every control to the control token', () => {
    const { rerender } = render(
      <SegmentedControl value="all" options={options} onChange={() => {}} size="sm" />,
    )
    expect(screen.getByRole('radio', { name: 'All' })).toHaveClass('h-control')

    rerender(<SegmentedControl value="all" options={options} onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'All' })).toHaveClass('h-control')

    rerender(
      <SegmentedControl
        value="all"
        options={options}
        onChange={() => {}}
        variant="separated"
        size="sm"
      />,
    )
    expect(screen.getByRole('radio', { name: 'All' })).toHaveClass('h-control')

    rerender(
      <SegmentedControl value="all" options={options} onChange={() => {}} variant="separated" />,
    )
    expect(screen.getByRole('radio', { name: 'All' })).toHaveClass('h-control')
  })

  it('renders separated options as radios in a group', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedControl
        value="win"
        options={options}
        onChange={onChange}
        variant="separated"
        ariaLabel="Outcome"
      />,
    )

    expect(screen.getByRole('radiogroup', { name: 'Outcome' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Win' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByRole('radio', { name: 'All' }))
    expect(onChange).toHaveBeenCalledWith('all')
  })

  it('moves selection with arrow keys in the separated variant', async () => {
    const user = userEvent.setup()
    render(<SeparatedOutcomeControl />)

    const all = screen.getByRole('radio', { name: 'All' })
    const win = screen.getByRole('radio', { name: 'Win' })
    expect(all).toHaveAttribute('tabindex', '0')
    expect(win).toHaveAttribute('tabindex', '-1')

    all.focus()
    await user.keyboard('{ArrowRight}')
    expect(win).toHaveFocus()
    expect(win).toHaveAttribute('aria-checked', 'true')
    expect(win).toHaveAttribute('tabindex', '0')
    expect(all).toHaveAttribute('aria-checked', 'false')
    expect(all).toHaveAttribute('tabindex', '-1')
  })

  it('keeps one radio in the tab order and moves selection with arrow keys', async () => {
    const user = userEvent.setup()
    render(<OutcomeControl />)

    const all = screen.getByRole('radio', { name: 'All' })
    const win = screen.getByRole('radio', { name: 'Win' })
    expect(all).toHaveAttribute('tabindex', '0')
    expect(win).toHaveAttribute('tabindex', '-1')

    all.focus()
    await user.keyboard('{ArrowRight}')
    expect(win).toHaveFocus()
    expect(win).toHaveAttribute('aria-checked', 'true')
    expect(win).toHaveAttribute('tabindex', '0')
    expect(all).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{ArrowRight}')
    expect(all).toHaveFocus()

    await user.keyboard('{End}')
    expect(win).toHaveFocus()

    await user.keyboard('{Home}')
    expect(all).toHaveFocus()
  })

  it('reverses the arrow direction in right-to-left layouts', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <div dir="rtl">
        <SegmentedControl
          value="all"
          options={threeOptions}
          onChange={onChange}
          ariaLabel="Outcome"
        />
      </div>,
    )

    screen.getByRole('radio', { name: 'All' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('loss')

    screen.getByRole('radio', { name: 'Loss' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith('all')
  })

  it('ignores full width for the separated variant', () => {
    render(
      <SegmentedControl
        value="all"
        options={options}
        onChange={() => {}}
        variant="separated"
        fullWidth
      />,
    )

    expect(screen.getByRole('radiogroup')).not.toHaveClass('w-full')
  })
})
