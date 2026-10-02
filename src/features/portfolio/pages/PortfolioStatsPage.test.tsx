import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { AssetDraft } from '@/data/models/asset'
import { clearAssets, createAsset } from '@/data/repositories/assets.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { PortfolioStatsPage } from './PortfolioStatsPage'

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
          <PortfolioStatsPage />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('PortfolioStatsPage filters', () => {
  beforeEach(async () => {
    await clearAssets()
  })

  it('scopes the stats to the selected markets', async () => {
    await createAsset(draft({ symbol: 'BTC', market: 'crypto', quantity: 1, currentPrice: 100 }))
    await createAsset(draft({ symbol: 'EURUSD', market: 'forex', quantity: 2, currentPrice: 100 }))

    renderPage()
    expect(await screen.findByText('2 assets')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Forex' }))

    expect(await screen.findByText('1 asset')).toBeInTheDocument()
  })

  it('changes the totals with the outcome filter and restores them with Clear all', async () => {
    await createAsset(draft({ symbol: 'AAA', market: 'crypto', quantity: 3, currentPrice: 150 }))
    await createAsset(draft({ symbol: 'BBB', market: 'stocks', quantity: 2, currentPrice: 200 }))
    await createAsset(draft({ symbol: 'CCC', market: 'forex', quantity: 1, currentPrice: 50 }))

    renderPage()
    expect(await screen.findByText('$900.00')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Gains' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByText('$850.00')).toBeInTheDocument()
    expect(screen.queryByText('$900.00')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(await screen.findByText('$900.00')).toBeInTheDocument()
    expect(screen.queryByText('$850.00')).not.toBeInTheDocument()
  })

  it('keeps the nothing-to-analyze state when there are no assets', async () => {
    renderPage()

    expect(await screen.findByText('Nothing to analyze yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  it('shows the filtered-empty message when assets exist but none match', async () => {
    await createAsset(draft({ symbol: 'BTC', market: 'crypto' }))

    renderPage()
    expect(await screen.findByText('1 asset')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Search'), 'zzz')

    expect(await screen.findByText('No assets match your filters')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Clear all' }).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'Remove Search: zzz' }))

    expect(await screen.findByText('1 asset')).toBeInTheDocument()
  })
})
