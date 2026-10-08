import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { FeesPnlPage } from './FeesPnlPage'

function renderPage(docSlug = 'calculator-fees-pnl') {
  render(
    <SettingsProvider>
      <I18nProvider>
        <FeesPnlPage docSlug={docSlug} />
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('FeesPnlPage', () => {
  it('nets fees and funding out of the gross PnL', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Entry price'), '100')
    await user.type(screen.getByLabelText('Exit price'), '110')
    await user.type(screen.getByLabelText('Size'), '10')

    expect(screen.getAllByText('$100.00')).toHaveLength(2)
    expect(screen.getByText('$98.95')).toBeInTheDocument()
  })
})
