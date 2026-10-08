import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { Sheet } from './Sheet'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Trade details"
        footer={<button type="button">Save trade</button>}
      >
        <button type="button">Inside action</button>
      </Sheet>
    </>
  )
}

describe('Sheet', () => {
  it('renders a labelled modal dialog', () => {
    render(
      <Sheet open onClose={() => {}} title="Trade details">
        <p>Body</p>
      </Sheet>,
      { wrapper: I18nProvider },
    )

    const dialog = screen.getByRole('dialog', { name: 'Trade details' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('moves focus to the first control and traps tab focus', async () => {
    const user = userEvent.setup()
    render(
      <Sheet
        open
        onClose={() => {}}
        title="Trade details"
        footer={<button type="button">Save trade</button>}
      >
        <button type="button">Inside action</button>
      </Sheet>,
      { wrapper: I18nProvider },
    )

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Save trade' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('keeps focus inside the dialog when tabbing past the last control', async () => {
    const user = userEvent.setup()
    render(
      <Sheet
        open
        onClose={() => {}}
        title="Trade details"
        footer={<button type="button">Save trade</button>}
      >
        <button type="button">Inside action</button>
      </Sheet>,
      { wrapper: I18nProvider },
    )

    screen.getByRole('button', { name: 'Save trade' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('restores focus to the opener when closed', async () => {
    const user = userEvent.setup()
    render(<Harness />, { wrapper: I18nProvider })

    const opener = screen.getByRole('button', { name: 'Open sheet' })
    await user.click(opener)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('locks background scrolling while open and releases it on close', () => {
    const { rerender } = render(
      <Sheet open onClose={() => {}} title="Trade details">
        <p>Body</p>
      </Sheet>,
      { wrapper: I18nProvider },
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Sheet open={false} onClose={() => {}} title="Trade details">
        <p>Body</p>
      </Sheet>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('marks the app root inert while open', () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)
    const { rerender, unmount } = render(
      <Sheet open onClose={() => {}} title="Trade details">
        <p>Body</p>
      </Sheet>,
      { container: root, wrapper: I18nProvider },
    )

    expect(root).toHaveAttribute('inert')

    rerender(
      <Sheet open={false} onClose={() => {}} title="Trade details">
        <p>Body</p>
      </Sheet>,
    )
    expect(root).not.toHaveAttribute('inert')

    unmount()
    root.remove()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="Trade details">
        <p>Body</p>
      </Sheet>,
      { wrapper: I18nProvider },
    )

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalled()
  })
})
