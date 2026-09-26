import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { PositionSizePage } from './PositionSizePage'

function renderPage() {
  render(
    <SettingsProvider>
      <I18nProvider>
        <PositionSizePage />
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
})
