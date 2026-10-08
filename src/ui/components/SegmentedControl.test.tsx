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

  it('sizes every non-compact control to the control token', () => {
    const { rerender } = render(
      <SegmentedControl value="all" options={options} onChange={() => {}} />,
    )

    expect(screen.getByRole('tab', { name: 'All' })).toHaveClass('h-control')

    rerender(<SegmentedControl value="all" options={options} onChange={() => {}} size="sm" />)
    expect(screen.getByRole('tab', { name: 'All' })).toHaveClass('h-control')

    rerender(
      <SegmentedControl value="all" options={options} onChange={() => {}} variant="separated" />,
    )
    expect(screen.getByRole('button', { name: 'All' })).toHaveClass('h-control')
  })

  it('sizes the compact control above the minimum target', () => {
    render(<SegmentedControl value="all" options={options} onChange={() => {}} size="xs" />)

    expect(screen.getByRole('tab', { name: 'All' })).toHaveClass('h-8')
  })

  it('renders separated options as pressed buttons in a group', async () => {
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

    expect(screen.getByRole('group', { name: 'Outcome' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Win' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(onChange).toHaveBeenCalledWith('all')
  })

  it('keeps one tab in the tab order and moves selection with arrow keys', async () => {
    const user = userEvent.setup()
    render(<OutcomeControl />)

    const all = screen.getByRole('tab', { name: 'All' })
    const win = screen.getByRole('tab', { name: 'Win' })
    expect(all).toHaveAttribute('tabindex', '0')
    expect(win).toHaveAttribute('tabindex', '-1')

    all.focus()
    await user.keyboard('{ArrowRight}')
    expect(win).toHaveFocus()
    expect(win).toHaveAttribute('aria-selected', 'true')
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

    screen.getByRole('tab', { name: 'All' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('loss')

    screen.getByRole('tab', { name: 'Loss' }).focus()
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

    expect(screen.getByRole('group')).not.toHaveClass('w-full')
  })
})
