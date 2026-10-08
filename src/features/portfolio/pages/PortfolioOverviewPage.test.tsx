import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { AssetDraft } from '@/data/models/asset'
import { clearAssets, createAsset } from '@/data/repositories/assets.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { PortfolioOverviewPage } from './PortfolioOverviewPage'

function draft(partial: Partial<AssetDraft> & Pick<AssetDraft, 'symbol'>): AssetDraft {
  return {
    market: 'crypto',
    name: null,
    quantity: 1,
    averageCost: 100,
    currentPrice: null,
    notes: null,
    ...partial,
  }
}

function renderPage() {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesGate>
          <PortfolioOverviewPage />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('PortfolioOverviewPage filters', () => {
  beforeEach(async () => {
    await clearAssets()
  })

  it('filters the table to the selected markets', async () => {
    await createAsset(draft({ symbol: 'BTC', market: 'crypto' }))
    await createAsset(draft({ symbol: 'EURUSD', market: 'forex' }))

    renderPage()
    expect(await screen.findByText('BTC')).toBeInTheDocument()
    expect(screen.getByText('EURUSD')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Market/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Forex' }))

    expect(screen.queryByText('BTC')).not.toBeInTheDocument()
    expect(screen.getByText('EURUSD')).toBeInTheDocument()
  })

  it('scopes the headline totals to the selected markets', async () => {
    await createAsset(draft({ symbol: 'BTC', market: 'crypto', quantity: 1, currentPrice: 100 }))
    await createAsset(draft({ symbol: 'EURUSD', market: 'forex', quantity: 2, currentPrice: 100 }))

    renderPage()
    expect(await screen.findByText('$300.00')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Market/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Forex' }))

    expect(await screen.findByText('EURUSD')).toBeInTheDocument()
    expect(screen.queryByText('$300.00')).not.toBeInTheDocument()
  })

  it('narrows the table and totals by outcome and restores them with Clear all', async () => {
    await createAsset(draft({ symbol: 'AAA', market: 'crypto', quantity: 3, currentPrice: 150 }))
    await createAsset(draft({ symbol: 'BBB', market: 'stocks', quantity: 2, currentPrice: 200 }))
    await createAsset(draft({ symbol: 'CCC', market: 'forex', quantity: 1, currentPrice: 50 }))

    renderPage()
    expect(await screen.findByText('AAA')).toBeInTheDocument()
    expect(screen.getByText('$900.00')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Outcome/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Gains' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText('AAA')).toBeInTheDocument()
    expect(screen.getByText('BBB')).toBeInTheDocument()
    expect(screen.queryByText('CCC')).not.toBeInTheDocument()
    expect(screen.getByText('$850.00')).toBeInTheDocument()
    expect(screen.queryByText('$900.00')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters: 1 active' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.getByText('CCC')).toBeInTheDocument()
    expect(screen.getByText('$900.00')).toBeInTheDocument()
    expect(screen.queryByText('$850.00')).not.toBeInTheDocument()
  })

  it('shows the filtered-empty state when nothing matches', async () => {
    await createAsset(draft({ symbol: 'BTC', market: 'crypto' }))

    renderPage()
    expect(await screen.findByText('BTC')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('button', { name: /Search/ }))
    await userEvent.type(screen.getByLabelText('Search'), 'zzz')

    expect(await screen.findByText('No assets match your filters')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters: 1 active' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear all' }),
    )

    expect(screen.getByText('BTC')).toBeInTheDocument()
  })
})
