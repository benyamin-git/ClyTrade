import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { RiskRewardPage } from './RiskRewardPage'

function renderPage(docSlug = 'calculator-risk-reward') {
  render(
    <SettingsProvider>
      <I18nProvider>
        <RiskRewardPage docSlug={docSlug} />
      </I18nProvider>
    </SettingsProvider>,
  )
}

describe('RiskRewardPage', () => {
  it('computes the R multiple and break-even win rate without fees', async () => {
    const user = userEvent.setup()
    renderPage()

    const entryFee = await screen.findByLabelText('Entry fee')
    await user.clear(entryFee)
    await user.type(entryFee, '0')
    const exitFee = screen.getByLabelText('Exit fee')
    await user.clear(exitFee)
    await user.type(exitFee, '0')

    await user.type(screen.getByLabelText('Entry price'), '100')
    await user.type(screen.getByLabelText('Stop price'), '95')
    await user.type(screen.getByLabelText('Target price'), '115')

    expect(screen.getByText('3R')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })
})
