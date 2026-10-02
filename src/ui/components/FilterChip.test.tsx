import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { FilterChip } from './FilterChip'

describe('FilterChip', () => {
  it('renders its label', () => {
    render(<FilterChip label="Open" onRemove={() => {}} />, { wrapper: I18nProvider })

    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('calls onRemove once when the remove control is clicked', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<FilterChip label="Open" onRemove={onRemove} />, { wrapper: I18nProvider })

    await user.click(screen.getByRole('button', { name: 'Remove Open' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
