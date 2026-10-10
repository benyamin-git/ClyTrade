import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown } from './Markdown'

describe('Markdown', () => {
  it('renders fenced code blocks left-to-right inside rtl layouts', () => {
    render(<Markdown>{'```\nrequiredMargin = positionNotional / leverage\n```'}</Markdown>)

    const pre = screen.getByText(/requiredMargin/).closest('pre')
    expect(pre).toHaveAttribute('dir', 'ltr')
  })

  it('renders inline code left-to-right too', () => {
    render(<Markdown>{'Set `dir="ltr"` on the block.'}</Markdown>)

    expect(screen.getByText('dir="ltr"')).toHaveAttribute('dir', 'ltr')
  })
})
