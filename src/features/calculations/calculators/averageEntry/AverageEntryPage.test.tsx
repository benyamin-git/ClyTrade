import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { AverageEntryPage } from './AverageEntryPage'

function renderPage(docSlug = 'calculator-average-entry') {
  render(
    <SettingsProvider>
      <I18nProvider>
        <AverageEntryPage docSlug={docSlug} />
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('AverageEntryPage', () => {
  it('blends the existing position with the add', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Existing size'), '10')
    await user.type(screen.getByLabelText('Existing entry price'), '100')
    await user.type(screen.getByLabelText('Add size'), '10')
    await user.type(screen.getByLabelText('Add price'), '120')

    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })
})
