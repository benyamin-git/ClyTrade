import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { SpotFuturesPage } from './SpotFuturesPage'

function renderPage(docSlug = 'calculator-spot-futures') {
  render(
    <SettingsProvider>
      <I18nProvider>
        <SpotFuturesPage docSlug={docSlug} />
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('SpotFuturesPage', () => {
  it('compares spot and leveraged quantities for the same capital', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Price'), '50')

    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getAllByText('200')).toHaveLength(2)
    expect(screen.getByText('10%')).toBeInTheDocument()
  })
})
