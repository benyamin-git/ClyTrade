import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { LiquidationPricePage } from './LiquidationPricePage'

function renderPage(docSlug = 'calculator-liquidation-price') {
  render(
    <SettingsProvider>
      <I18nProvider>
        <LiquidationPricePage docSlug={docSlug} />
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('LiquidationPricePage', () => {
  it('estimates a 10x long liquidation below entry', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Entry price'), '100')

    expect(screen.getByText('90.5')).toBeInTheDocument()
    expect(screen.getByText('9.5%')).toBeInTheDocument()
  })
})
