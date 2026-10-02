import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { Market } from '@/data/models/market'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import type { Trade } from '@/data/models/trade'
import { clearSettings, setPreferences } from '@/data/repositories/settings.repo'
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
