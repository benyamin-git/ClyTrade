import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { TradeDraft } from '@/data/models/trade'
import { clearTrades, createTrade } from '@/data/repositories/trades.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { JournalOverviewPage } from './JournalOverviewPage'

function draft(partial: Partial<TradeDraft> & Pick<TradeDraft, 'symbol'>): TradeDraft {
  return {
    market: 'crypto',
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
    ...partial,
  }
}

function renderPage() {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesGate>
          <JournalOverviewPage />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('JournalOverviewPage market filter', () => {
  beforeEach(async () => {
    await clearTrades()
  })

  it('filters the table to the selected market', async () => {
    await createTrade(draft({ symbol: 'BTCUSDT', market: 'crypto' }))
    await createTrade(draft({ symbol: 'AAPL', market: 'stocks' }))

    renderPage()
    expect(await screen.findByText('BTCUSDT')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Market'), 'stocks')

    expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })
})
