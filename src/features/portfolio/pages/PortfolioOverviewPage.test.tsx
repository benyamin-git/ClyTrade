import { render, screen } from '@testing-library/react'
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

describe('PortfolioOverviewPage market filter', () => {
  beforeEach(async () => {
    await clearAssets()
  })

  it('filters the table to the selected market', async () => {
    await createAsset(draft({ symbol: 'BTC', market: 'crypto' }))
    await createAsset(draft({ symbol: 'EURUSD', market: 'forex' }))

    renderPage()
    expect(await screen.findByText('BTC')).toBeInTheDocument()
    expect(screen.getByText('EURUSD')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Market'), 'forex')

    expect(screen.queryByText('BTC')).not.toBeInTheDocument()
    expect(screen.getByText('EURUSD')).toBeInTheDocument()
  })

  it('scopes the headline totals to the selected market', async () => {
    await createAsset(draft({ symbol: 'BTC', market: 'crypto', quantity: 1, currentPrice: 100 }))
    await createAsset(draft({ symbol: 'EURUSD', market: 'forex', quantity: 2, currentPrice: 100 }))

    renderPage()
    expect(await screen.findByText('$300.00')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Market'), 'forex')

    expect(await screen.findByText('EURUSD')).toBeInTheDocument()
    expect(screen.queryByText('$300.00')).not.toBeInTheDocument()
  })
})
