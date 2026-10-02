import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { TradeDraft } from '@/data/models/trade'
import { clearTrades, createTrade } from '@/data/repositories/trades.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { JournalStatsPage } from './JournalStatsPage'

function closedDraft(symbol: string, market: TradeDraft['market']): TradeDraft {
  const openedAt = Date.now() - 86_400_000
  return {
    symbol,
    market,
    direction: 'long',
    status: 'closed',
    entryPrice: 100,
    exitPrice: 110,
    size: 1,
    leverage: 10,
    stopPrice: 95,
    targetPrice: 120,
    fees: 0,
    openedAt,
    closedAt: openedAt + 3_600_000,
    strategy: null,
    notes: null,
    tags: [],
  }
}

function renderPage() {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesGate>
          <JournalStatsPage />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('JournalStatsPage market filter', () => {
  beforeEach(async () => {
    await clearTrades()
  })

  it('scopes stats to the selected market', async () => {
    await createTrade(closedDraft('BTCUSDT', 'crypto'))
    await createTrade(closedDraft('AAPL', 'stocks'))

    renderPage()
    expect(await screen.findByText(/2 closed/)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Market'), 'stocks')

    expect(await screen.findByText(/1 closed/)).toBeInTheDocument()
  })
})
