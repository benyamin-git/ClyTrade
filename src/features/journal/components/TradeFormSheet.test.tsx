import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { Market } from '@/data/models/market'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import type { Trade } from '@/data/models/trade'
import { clearSettings, setPreferences } from '@/data/repositories/settings.repo'
import { clearTrades, listTrades } from '@/data/repositories/trades.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { TradeFormSheet } from './TradeFormSheet'

function makeTrade(market: Market): Trade {
  return {
    id: 'trade-1',
    symbol: 'BTCUSDT',
    market,
    direction: 'long',
    status: 'open',
    entryPrice: 100,
    exitPrice: null,
    size: 1,
    leverage: 10,
    stopPrice: null,
    targetPrice: null,
    fees: 0,
    openedAt: Date.now(),
    closedAt: null,
    strategy: null,
    notes: null,
    tags: [],
    createdAt: 1,
    updatedAt: 1,
  }
}

function renderForm(trade: Trade | null) {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesGate>
          <TradeFormSheet trade={trade} onClose={() => undefined} />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('TradeFormSheet market field', () => {
  beforeEach(async () => {
    await clearSettings()
  })

  it('prefills the market from preferences for a new trade', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'forex' })
    renderForm(null)

    expect(await screen.findByLabelText('Market')).toHaveValue('forex')
  })

  it('shows the market of an existing trade', async () => {
    renderForm(makeTrade('stocks'))

    expect(await screen.findByLabelText('Market')).toHaveValue('stocks')
  })
})

describe('TradeFormSheet validation', () => {
  beforeEach(async () => {
    await clearSettings()
    await clearTrades()
  })

  async function fillRequiredFields() {
    await userEvent.type(await screen.findByLabelText('Symbol'), 'ETHUSDT')
    await userEvent.type(screen.getByLabelText('Entry price'), '100')
    await userEvent.type(screen.getByLabelText('Size'), '1')
  }

  function setDate(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }

  function save() {
    fireEvent.click(screen.getByRole('button', { name: 'Add trade' }))
  }

  it('saves an exit price with a closed date as closed', async () => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Exit price'), '110')
    setDate('Opened', '2026-01-05')
    setDate('Closed', '2026-01-06')
    save()

    await waitFor(async () => {
      expect(await listTrades()).toHaveLength(1)
    })
    const [saved] = await listTrades()
    expect(saved?.status).toBe('closed')
    expect(saved?.exitPrice).toBe(110)
    expect(saved?.closedAt).not.toBeNull()
  })

  it('rejects an exit price without a closed date', async () => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Exit price'), '110')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A closed date is required when an exit price is set.',
    )
    expect(await listTrades()).toEqual([])
  })

  it('rejects a closed date without an exit price', async () => {
    renderForm(null)
    await fillRequiredFields()
    setDate('Opened', '2026-01-05')
    setDate('Closed', '2026-01-06')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An exit price is required when a closed date is set.',
    )
    expect(await listTrades()).toEqual([])
  })

  it('rejects a closed date before the opened date', async () => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Exit price'), '110')
    setDate('Opened', '2026-01-06')
    setDate('Closed', '2026-01-05')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Closed date cannot be before the opened date.',
    )
    expect(await listTrades()).toEqual([])
  })

  it.each([
    ['Exit price', 'Exit price must be greater than 0.'],
    ['Stop price', 'Stop price must be greater than 0.'],
    ['Target price', 'Target price must be greater than 0.'],
  ])('rejects zero in the %s field', async (label, message) => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText(label), '0')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(await listTrades()).toEqual([])
  })

  it('rejects negative fees', async () => {
    renderForm(null)
    await fillRequiredFields()
    fireEvent.change(screen.getByLabelText('Fees (total)'), { target: { value: '-1' } })
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Fees cannot be negative.')
    expect(await listTrades()).toEqual([])
  })
})
