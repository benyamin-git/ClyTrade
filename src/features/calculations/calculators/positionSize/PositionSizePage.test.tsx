import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { PositionSizePage } from './PositionSizePage'

function renderPage(docSlug = 'calculator-position-size') {
  render(
    <SettingsProvider>
      <I18nProvider>
        <PositionSizePage docSlug={docSlug} />
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('PositionSizePage', () => {
  it('keeps a single risk input when the unit changes', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByLabelText('Risk')).toHaveValue('1')
    expect(screen.getAllByRole('textbox')).toHaveLength(6)

    const riskUnit = screen.getByRole('tablist', { name: 'Risk unit' })
    await user.click(within(riskUnit).getByRole('tab', { name: '$' }))

    expect(screen.getAllByLabelText('Risk')).toHaveLength(1)
    expect(screen.getByLabelText('Risk')).toHaveValue('10')
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
  })

  it('keeps the prefilled fee when the unit changes before a notional exists', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByLabelText('Fee per side')).toHaveValue('0.05')

    const feeUnit = screen.getByRole('tablist', { name: 'Fee per side unit' })
    await user.click(within(feeUnit).getByRole('tab', { name: '$' }))

    expect(screen.getByLabelText('Fee per side')).toHaveValue('0.05')
  })

  it('renders the help target supplied by the registry', async () => {
    renderPage('calculator-risk-reward')

    expect(await screen.findByRole('button', { name: 'About Risk / Reward' })).toBeInTheDocument()
  })
})
