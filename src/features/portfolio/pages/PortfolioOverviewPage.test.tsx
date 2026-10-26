import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { AssetDraft } from '@/data/models/asset'
import { clearAssets, createAsset } from '@/data/repositories/assets.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { formatTime } from '@/lib/dates'
import type { ProviderPrice } from '@/market/types'
import { PortfolioOverviewPage } from './PortfolioOverviewPage'

const marketState = vi.hoisted(() => ({
  prices: new Map() as Map<string, ProviderPrice>,
}))

vi.mock('@/market/usePrices', () => ({
  usePrices: () => ({
    prices: marketState.prices,
    status: {
      provider: 'auto',
      activeProvider: null,
      lastSuccessAt: null,
      nextAllowedAt: null,
      monthlyUsage: null,
      error: null,
    },
    refresh: async () => undefined,
  }),
}))

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

function providerPrice(
  overrides: Partial<ProviderPrice> & Pick<ProviderPrice, 'key'>,
): ProviderPrice {
  return {
    symbol: 'BTC',
    provider: 'binance',
    price: 68000,
    fetchedAt: Date.now(),
    sourceTimestamp: null,
    ...overrides,
  }
}

describe('PortfolioOverviewPage automatic prices', () => {
  beforeEach(async () => {
    await clearAssets()
    marketState.prices = new Map()
  })

  it('shows a fresh crypto price and its timestamp', async () => {
    await createAsset(
      draft({
        symbol: 'BTC',
        market: 'crypto',
        autoPrice: true,
        binanceSymbol: 'BTCUSDT',
      }),
    )
    const fetchedAt = Date.now()
    marketState.prices = new Map([
      ['binance:BTCUSDT', providerPrice({ key: 'binance:BTCUSDT', fetchedAt })],
    ])

    renderPage()

    expect(await screen.findByText('68,000')).toBeInTheDocument()
    expect(screen.getByText(formatTime(fetchedAt))).toBeInTheDocument()
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
  })

  it('does not write or show provider timestamps for manual assets', async () => {
    await createAsset(
      draft({
        symbol: 'BTC',
        market: 'crypto',
        autoPrice: false,
        binanceSymbol: 'BTCUSDT',
      }),
    )
    const fetchedAt = Date.now() - 20 * 60_000
    marketState.prices = new Map([
      ['binance:BTCUSDT', providerPrice({ key: 'binance:BTCUSDT', fetchedAt })],
    ])

    renderPage()

    expect(await screen.findByText('at cost')).toBeInTheDocument()
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
    expect(screen.queryByText(formatTime(fetchedAt))).not.toBeInTheDocument()
  })

  it('does not show provider timestamps for non-crypto assets', async () => {
    await createAsset(
      draft({
        symbol: 'BTC',
        market: 'forex',
        autoPrice: true,
        binanceSymbol: 'BTCUSDT',
      }),
    )
    const fetchedAt = Date.now() - 20 * 60_000
    marketState.prices = new Map([
      ['binance:BTCUSDT', providerPrice({ key: 'binance:BTCUSDT', fetchedAt })],
    ])

    renderPage()

    expect(await screen.findByText('at cost')).toBeInTheDocument()
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
    expect(screen.queryByText(formatTime(fetchedAt))).not.toBeInTheDocument()
  })

  it('ignores fresh provider prices for manual and non-crypto rows', async () => {
    await createAsset(
      draft({
        symbol: 'BTC',
        market: 'crypto',
        autoPrice: false,
        binanceSymbol: 'BTCUSDT',
      }),
    )
    await createAsset(
      draft({
        symbol: 'ETH',
        market: 'forex',
        autoPrice: true,
        binanceSymbol: 'ETHUSDT',
      }),
    )
    const fetchedAt = Date.now()
    marketState.prices = new Map([
      ['binance:BTCUSDT', providerPrice({ key: 'binance:BTCUSDT', fetchedAt })],
      [
        'binance:ETHUSDT',
        providerPrice({ key: 'binance:ETHUSDT', symbol: 'ETH', price: 3000, fetchedAt }),
      ],
    ])

    renderPage()

    expect(await screen.findByText('BTC')).toBeInTheDocument()
    expect(screen.getByText('ETH')).toBeInTheDocument()
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
    expect(document.querySelector('time')).toBeNull()
  })

  it('leaves stale prices unwritten and badges them', async () => {
    await createAsset(
      draft({
        symbol: 'BTC',
        market: 'crypto',
        autoPrice: true,
        binanceSymbol: 'BTCUSDT',
      }),
    )
    const fetchedAt = Date.now() - 20 * 60_000
    marketState.prices = new Map([
      ['binance:BTCUSDT', providerPrice({ key: 'binance:BTCUSDT', fetchedAt })],
    ])

    renderPage()

    expect(await screen.findByText('Stale')).toBeInTheDocument()
    expect(screen.getByText(formatTime(fetchedAt))).toBeInTheDocument()
    expect(screen.getByText('at cost')).toBeInTheDocument()
  })
})
