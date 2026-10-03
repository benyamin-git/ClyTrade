import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { TradeDraft } from '@/data/models/trade'
import { clearTrades, createTrade } from '@/data/repositories/trades.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { JournalStatsPage } from './JournalStatsPage'

function closedDraft(symbol: string, market: TradeDraft['market'], exitPrice = 110): TradeDraft {
  const openedAt = Date.now() - 86_400_000
  return {
    symbol,
    market,
    direction: 'long',
    status: 'closed',
    entryPrice: 100,
    exitPrice,
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

describe('JournalStatsPage filters', () => {
  beforeEach(async () => {
    await clearTrades()
  })

  it('scopes stats to the selected market', async () => {
    await createTrade(closedDraft('BTCUSDT', 'crypto'))
    await createTrade(closedDraft('AAPL', 'stocks'))

    renderPage()
    expect(await screen.findByText(/2 closed/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Market/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Stocks' }))

    expect(await screen.findByText(/1 closed/)).toBeInTheDocument()
  })

  it('narrows the headline numbers with an outcome filter', async () => {
    await createTrade(closedDraft('BTCUSDT', 'crypto', 110))
    await createTrade(closedDraft('AAPL', 'stocks', 90))

    renderPage()
    expect(await screen.findByText(/2 closed/)).toBeInTheDocument()
    expect(screen.getByText('1W / 1L')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Outcome/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Wins' }))

    expect(await screen.findByText(/1 closed/)).toBeInTheDocument()
    expect(screen.getByText('1W / 0L')).toBeInTheDocument()
  })

  it('shows the filtered-empty state when a filter matches no trades', async () => {
    await createTrade(closedDraft('BTCUSDT', 'crypto', 110))

    renderPage()
    expect(await screen.findByText(/1 closed/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Outcome/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Losses' }))

    expect(await screen.findByText('No trades match your filters')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Clear all' }).length).toBeGreaterThan(0)
  })

  it('resets the time range to the preference default with Clear all', async () => {
    await createTrade(closedDraft('BTCUSDT', 'crypto'))

    renderPage()
    expect(await screen.findByText(/1 closed/)).toBeInTheDocument()

    const timeRange = screen.getByRole('tablist', { name: 'Time range' })
    await userEvent.click(within(timeRange).getByRole('tab', { name: '7D' }))
    expect(within(timeRange).getByRole('tab', { name: '7D' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: /Filters/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(within(timeRange).getByRole('tab', { name: '30D' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
