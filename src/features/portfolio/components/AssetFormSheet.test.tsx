import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { Asset } from '@/data/models/asset'
import type { Market } from '@/data/models/market'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import { clearSettings, setPreferences } from '@/data/repositories/settings.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { AssetFormSheet } from './AssetFormSheet'

function makeAsset(market: Market): Asset {
  return {
    id: 'asset-1',
    symbol: 'BTC',
    market,
    name: 'Bitcoin',
    quantity: 1,
    averageCost: 100,
    currentPrice: null,
    notes: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

function renderForm(asset: Asset | null) {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesGate>
          <AssetFormSheet asset={asset} onClose={() => undefined} />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('AssetFormSheet market field', () => {
  beforeEach(async () => {
    await clearSettings()
  })

  it('prefills the market from preferences for a new asset', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    renderForm(null)

    expect(await screen.findByLabelText('Market')).toHaveValue('crypto')
  })

  it('shows the market of an existing asset', async () => {
    renderForm(makeAsset('forex'))

    expect(await screen.findByLabelText('Market')).toHaveValue('forex')
  })
})
