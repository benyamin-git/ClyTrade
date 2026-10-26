import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { TradeDraft } from '@/data/models/trade'
import {
  applyAutoClose,
  AUTO_CLOSED_TAG,
  clearTrades,
  createTrade,
  getTrade,
} from '@/data/repositories/trades.repo'
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

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Market/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Stocks' }))

    expect(screen.queryByText('BTCUSDT')).not.toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('narrows the table with the search field and restores it with Clear all', async () => {
    await createTrade(draft({ symbol: 'BTCUSDT', market: 'crypto' }))
    await createTrade(draft({ symbol: 'AAPL', market: 'stocks' }))

    renderPage()
    expect(await screen.findByText('BTCUSDT')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Search/ }))
    await userEvent.type(screen.getByLabelText('Search'), 'BTC')

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('shows status from the exit price, not the closed date', async () => {
    await createTrade(
      draft({ symbol: 'EXITONLY', status: 'closed', exitPrice: 110, closedAt: null }),
    )
    await createTrade(
      draft({ symbol: 'CLOSEONLY', status: 'open', exitPrice: null, closedAt: Date.now() }),
    )

    renderPage()

    const exitRow = (await screen.findByText('EXITONLY')).closest('tr')
    expect(exitRow).not.toBeNull()
    expect(within(exitRow as HTMLElement).getByText('Closed')).toBeInTheDocument()

    const closeRow = screen.getByText('CLOSEONLY').closest('tr')
    expect(closeRow).not.toBeNull()
    expect(within(closeRow as HTMLElement).getByText('Open')).toBeInTheDocument()
  })
})

describe('JournalOverviewPage auto-closed trades', () => {
  beforeEach(async () => {
    await clearTrades()
  })

  it('shows the auto-closed tag and note and keeps the trade editable', async () => {
    const trade = await createTrade(
      draft({ symbol: 'AUTOCLOSE', targetPrice: 120, autoClose: true }),
    )
    const note = 'Auto-closed AUTOCLOSE at 120 (Target hit).'
    await applyAutoClose(trade.id, { level: 120, at: Date.now(), note })

    renderPage()

    const row = (await screen.findByText('AUTOCLOSE')).closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText(`#${AUTO_CLOSED_TAG}`)).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText('Closed')).toBeInTheDocument()

    await userEvent.click(
      within(row as HTMLElement).getByRole('button', { name: 'Edit AUTOCLOSE' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Edit AUTOCLOSE' })
    const notes = within(dialog).getByLabelText('Notes')
    expect(notes).toHaveValue(note)

    await userEvent.clear(notes)
    await userEvent.type(notes, 'Reviewed after auto-close')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => {
      expect((await getTrade(trade.id))?.notes).toBe('Reviewed after auto-close')
    })
  })
})
