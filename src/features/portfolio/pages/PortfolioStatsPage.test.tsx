import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { AssetDraft } from '@/data/models/asset'
import { clearAssets, createAsset } from '@/data/repositories/assets.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { PortfolioStatsPage } from './PortfolioStatsPage'

function draft(symbol: string, market: AssetDraft['market']): AssetDraft {
  return {
    symbol,
    market,
    name: null,
    quantity: 1,
    averageCost: 100,
    currentPrice: 110,
    notes: null,
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

describe('PortfolioStatsPage market filter', () => {
  beforeEach(async () => {
    await clearAssets()
  })

  it('scopes the portfolio totals to the selected market', async () => {
    await createAsset(draft('BTC', 'crypto'))
    await createAsset(draft('AAPL', 'stocks'))

    renderPage()
    expect(await screen.findByText('2 assets')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Market'), 'stocks')

    expect(await screen.findByText('1 asset')).toBeInTheDocument()
  })
})
