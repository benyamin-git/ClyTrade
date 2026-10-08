import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { MarginLeveragePage } from './MarginLeveragePage'

function renderPage(docSlug = 'calculator-margin-leverage') {
  render(
    <SettingsProvider>
      <I18nProvider>
        <MarginLeveragePage docSlug={docSlug} />
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('MarginLeveragePage', () => {
  it('computes required margin and the liquidation move', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Position notional'), '5000')

    expect(screen.getByText('$500.00')).toBeInTheDocument()
    expect(screen.getByText('9.5%')).toBeInTheDocument()
  })
})
