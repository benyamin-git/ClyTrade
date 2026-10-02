import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CollapsibleSection } from './CollapsibleSection'

describe('CollapsibleSection', () => {
  it('is expanded by default and shows its children', () => {
    render(
      <CollapsibleSection title="Asset types">
        <p>Body content</p>
      </CollapsibleSection>,
    )

    expect(screen.getByRole('button', { name: /Asset types/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('collapses and expands when toggled', async () => {
    const user = userEvent.setup()
    render(
      <CollapsibleSection title="Asset types">
        <p>Body content</p>
      </CollapsibleSection>,
    )

    await user.click(screen.getByRole('button', { name: /Asset types/ }))
    expect(screen.getByRole('button', { name: /Asset types/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByText('Body content')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Asset types/ }))
    expect(screen.getByRole('button', { name: /Asset types/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('can start collapsed via defaultOpen', () => {
    render(
      <CollapsibleSection title="Asset types" defaultOpen={false}>
        <p>Body content</p>
      </CollapsibleSection>,
    )

    expect(screen.getByRole('button', { name: /Asset types/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByText('Body content')).not.toBeInTheDocument()
  })

  it('renders the count when provided', () => {
    render(
      <CollapsibleSection title="Asset types" count={3}>
        <p>Body content</p>
      </CollapsibleSection>,
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('omits the count when not provided', () => {
    render(
      <CollapsibleSection title="Asset types">
        <p>Body content</p>
      </CollapsibleSection>,
    )

    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
