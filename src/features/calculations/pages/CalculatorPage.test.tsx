import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import {
  resetCalculatorInputs,
  setCalculatorInput,
  type CalculatorInputs,
} from '../logic/calculatorInputs'
import { CalculatorPage } from './CalculatorPage'

function setInputs(inputs: CalculatorInputs) {
  resetCalculatorInputs()
  for (const [key, value] of Object.entries(inputs)) {
    setCalculatorInput(key as keyof CalculatorInputs, value)
  }
}

function renderPage() {
  render(
    <SettingsProvider>
      <I18nProvider>
        <MemoryRouter>
          <CalculatorPage docSlug="calculator-overview" />
        </MemoryRouter>
      </I18nProvider>
    </SettingsProvider>,
  )
}

const fullInputs: CalculatorInputs = {
  risk: 100,
  entryPrice: 100,
  targetPrice: 115,
  stopPrice: 95,
  feePercent: 0.1,
  leverage: 10,
  maintenanceMarginPercent: 0.5,
  winRatePercent: 50,
}

describe('CalculatorPage', () => {
  afterEach(resetCalculatorInputs)

  it('renders the results the inputs support', async () => {
    setInputs(fullInputs)
    renderPage()

    expect(await screen.findByText('2.85R')).toBeInTheDocument()
    expect(screen.getByText('26%')).toBeInTheDocument()
    expect(screen.getByText('Required margin')).toBeInTheDocument()
    expect(screen.getByText('Liquidation price')).toBeInTheDocument()
    expect(screen.queryByText('Realised R/R')).not.toBeInTheDocument()
    expect(screen.getByText('Liquidation distance')).toBeInTheDocument()
    expect(screen.getByText('Recommended risk')).toBeInTheDocument()
    expect(screen.queryByText('Liquidation move')).not.toBeInTheDocument()
    expect(screen.queryByText('Exit distance')).not.toBeInTheDocument()
  })

  it('hides results that need missing inputs', async () => {
    setInputs({ ...fullInputs, targetPrice: null, leverage: null })
    renderPage()

    expect(await screen.findByText('Unit size')).toBeInTheDocument()
    expect(screen.queryByText('R/R')).not.toBeInTheDocument()
    expect(screen.queryByText('Required margin')).not.toBeInTheDocument()
  })

  it('shows the empty state when nothing can be calculated', async () => {
    setInputs({ ...fullInputs, entryPrice: null })
    renderPage()

    expect(await screen.findByText('Not enough inputs yet')).toBeInTheDocument()
  })

  it('prefills leverage, fee per side and maintenance margin from preferences', async () => {
    renderPage()

    expect(await screen.findByDisplayValue('0.05')).toBeInTheDocument()
    expect(screen.getByLabelText('Leverage')).toHaveValue('10')
    expect(screen.getByLabelText('Maintenance margin')).toHaveValue('0.5')
  })

  it('moves focus to the next field on Enter', async () => {
    const user = userEvent.setup()
    renderPage()

    const risk = await screen.findByLabelText('Risk')
    await user.click(risk)
    await user.type(risk, '250')
    await user.keyboard('{Enter}')

    expect(screen.getByLabelText('Entry price')).toHaveFocus()

    await user.type(screen.getByLabelText('Entry price'), '68200')
    await user.keyboard('{Enter}')

    expect(screen.getByLabelText('Target price')).toHaveFocus()
  })
})
