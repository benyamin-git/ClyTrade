import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { Asset } from '@/data/models/asset'
import type { Market } from '@/data/models/market'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import { clearAssets, createAsset, listAssets } from '@/data/repositories/assets.repo'
import { clearSettings, setPreferences } from '@/data/repositories/settings.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import type { SymbolCandidate } from '@/market/symbols'
import type { ProviderPrice } from '@/market/types'
import { AssetFormSheet } from './AssetFormSheet'

const symbolState = vi.hoisted(() => ({
  bySymbol: new Map<string, SymbolCandidate[]>(),
}))

const priceState = vi.hoisted(() => ({
  prices: new Map<string, ProviderPrice>(),
  keys: new Set<string>(),
  reasons: new Set<string>(),
}))

vi.mock('@/market/symbols', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/market/symbols')>()
  return {
    ...actual,
    resolveSymbol: async (input: string) =>
      symbolState.bySymbol.get(input.trim().toUpperCase()) ?? [],
  }
})

vi.mock('@/market/usePrices', () => ({
  usePrices: (refs: readonly { key: string }[], reason: string) => {
    for (const ref of refs) priceState.keys.add(ref.key)
    priceState.reasons.add(reason)
    return {
      prices: priceState.prices,
      status: {
        provider: 'auto',
        activeProvider: null,
        lastSuccessAt: null,
        nextAllowedAt: null,
        monthlyUsage: null,
        error: null,
      },
      refresh: async () => undefined,
    }
  },
}))

function makeAsset(market: Market, overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    symbol: 'BTC',
    market,
    name: 'Bitcoin',
    quantity: 1,
    averageCost: 100,
    currentPrice: null,
    notes: null,
    autoPrice: false,
    binanceSymbol: null,
    coingeckoId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function binanceCandidate(overrides: Partial<SymbolCandidate> = {}): SymbolCandidate {
  return {
    provider: 'binance',
    priceId: 'BTCUSDT',
    symbol: 'BTCUSDT',
    name: null,
    quote: 'USDT',
    rank: null,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: null,
    ...overrides,
  }
}

function coinGeckoCandidate(): SymbolCandidate {
  return binanceCandidate({
    provider: 'coingecko',
    priceId: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    quote: null,
    rank: 1,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
  })
}

function ethereumCandidate(): SymbolCandidate {
  return binanceCandidate({
    priceId: 'ETHUSDT',
    symbol: 'ETHUSDT',
    binanceSymbol: 'ETHUSDT',
  })
}

function freshPrice(overrides: Partial<ProviderPrice> = {}): ProviderPrice {
  return {
    key: 'binance:BTCUSDT',
    symbol: 'BTC',
    provider: 'binance',
    price: 68000,
    fetchedAt: Date.now(),
    sourceTimestamp: null,
    ...overrides,
  }
}

async function renderForm(asset: Asset | null) {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesGate>
          <AssetFormSheet asset={asset} onClose={() => undefined} />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
  await screen.findByLabelText('Symbol')
}

async function fillNewAsset(user: ReturnType<typeof userEvent.setup>, symbol = 'BTC') {
  await user.type(screen.getByLabelText('Symbol'), symbol)
  await user.type(screen.getByLabelText('Quantity'), '1')
  await user.type(screen.getByLabelText('Average cost'), '100')
}

async function savedAssets(): Promise<Asset[]> {
  await waitFor(async () => {
    expect(await listAssets()).toHaveLength(1)
  })
  return listAssets()
}

async function saveNewAsset(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Add asset' }))
  return savedAssets()
}

async function saveChanges(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  return savedAssets()
}

async function seedAsset(overrides: Partial<Asset> = {}): Promise<Asset> {
  return createAsset({
    symbol: 'BTC',
    market: 'crypto',
    name: 'Bitcoin',
    quantity: 1,
    averageCost: 100,
    currentPrice: null,
    notes: null,
    autoPrice: false,
    binanceSymbol: null,
    coingeckoId: null,
    ...overrides,
  })
}

describe('AssetFormSheet market field', () => {
  beforeEach(async () => {
    await clearSettings()
    await clearAssets()
    symbolState.bySymbol.clear()
    priceState.prices.clear()
    priceState.keys.clear()
    priceState.reasons.clear()
  })

  it('prefills the market from preferences for a new asset', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    await renderForm(null)

    expect(await screen.findByLabelText('Market')).toHaveValue('crypto')
  })

  it('shows the market of an existing asset', async () => {
    await renderForm(makeAsset('forex'))

    expect(await screen.findByLabelText('Market')).toHaveValue('forex')
  })
})

describe('AssetFormSheet automatic prices', () => {
  beforeEach(async () => {
    await clearSettings()
    await clearAssets()
    symbolState.bySymbol.clear()
    priceState.prices.clear()
    priceState.keys.clear()
    priceState.reasons.clear()
  })

  it('defaults a new crypto asset to automatic prices', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    const group = await screen.findByRole('radiogroup', { name: 'Automatic price' })
    expect(within(group).getByRole('radio', { name: 'Automatic' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await fillNewAsset(user)
    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({ autoPrice: true, binanceSymbol: 'BTCUSDT', coingeckoId: null })
  })

  it('defaults a new non-crypto asset to manual prices', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'forex' })
    const user = userEvent.setup()
    await renderForm(null)

    expect(screen.queryByRole('radiogroup', { name: 'Automatic price' })).not.toBeInTheDocument()

    await fillNewAsset(user, 'EURUSD')
    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({ autoPrice: false, binanceSymbol: null, coingeckoId: null })
  })

  it('shows the market symbol picker for an unspecified market and switches it to crypto', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    const picker = await screen.findByLabelText('Market symbol')
    await user.selectOptions(picker, 'coingecko:bitcoin')

    expect(screen.getByLabelText('Market')).toHaveValue('crypto')
    const group = await screen.findByRole('radiogroup', { name: 'Automatic price' })
    expect(within(group).getByRole('radio', { name: 'Automatic' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.type(screen.getByLabelText('Average cost'), '100')

    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({
      market: 'crypto',
      autoPrice: true,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
  })

  it('switches an unspecified asset to crypto when the symbol has one match', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Market')).toHaveValue('crypto'))
    expect(screen.queryByLabelText('Market symbol')).not.toBeInTheDocument()
    await waitFor(() => expect(priceState.keys.has('binance:BTCUSDT')).toBe(true))

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.type(screen.getByLabelText('Average cost'), '100')

    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({
      market: 'crypto',
      autoPrice: true,
      binanceSymbol: 'BTCUSDT',
    })
  })

  it('keeps an existing unspecified asset unspecified until a symbol is chosen', async () => {
    const seeded = await seedAsset({ market: 'unspecified' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    await renderForm(seeded)

    expect(await screen.findByLabelText('Market symbol')).toBeInTheDocument()
    expect(screen.getByLabelText('Market')).toHaveValue('unspecified')

    const [asset] = await saveChanges(user)
    expect(asset?.market).toBe('unspecified')
  })

  it('keeps the stored automatic price setting when editing', async () => {
    const seeded = await seedAsset({ autoPrice: false, binanceSymbol: 'BTCUSDT' })
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    await renderForm(seeded)

    const group = await screen.findByRole('radiogroup', { name: 'Automatic price' })
    expect(within(group).getByRole('radio', { name: 'Manual' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    const [asset] = await saveChanges(user)
    expect(asset).toMatchObject({ autoPrice: false, binanceSymbol: 'BTCUSDT', coingeckoId: null })
  })

  it('keeps a stored automatic price setting on a non-crypto asset', async () => {
    const seeded = await seedAsset({ market: 'forex', symbol: 'EURUSD', autoPrice: true })
    const user = userEvent.setup()
    await renderForm(seeded)

    expect(screen.queryByRole('radiogroup', { name: 'Automatic price' })).not.toBeInTheDocument()

    const [asset] = await saveChanges(user)
    expect(asset?.autoPrice).toBe(true)
  })

  it('shows the picker for ambiguous candidates and saves the chosen mapping', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    const picker = await screen.findByLabelText('Market symbol')
    await user.selectOptions(picker, 'coingecko:bitcoin')
    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.type(screen.getByLabelText('Average cost'), '100')

    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({
      autoPrice: true,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
  })

  it('selects a single preferred candidate automatically', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    await fillNewAsset(user)
    await waitFor(() => expect(priceState.keys.has('binance:BTCUSDT')).toBe(true))
    expect(screen.queryByLabelText('Market symbol')).not.toBeInTheDocument()

    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({ autoPrice: true, binanceSymbol: 'BTCUSDT', coingeckoId: null })
  })

  it('shows the price unavailable hint when no symbol matches and still saves', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [])
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    expect(
      await screen.findByText(
        'No live price found for this symbol. You can still save and enter a price manually.',
      ),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.type(screen.getByLabelText('Average cost'), '100')

    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({ autoPrice: true, binanceSymbol: null, coingeckoId: null })
  })

  it('prefills an empty current price from a fresh price', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue('68000'))
    expect(priceState.reasons.has('detail')).toBe(true)
  })

  it('does not overwrite a current price the user typed', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    const priceInput = screen.getByLabelText('Current price')
    await user.type(priceInput, '123')

    priceState.prices.set('binance:BTCUSDT', freshPrice())
    await user.type(screen.getByLabelText('Name'), 'Bitcoin')

    expect(priceInput).toHaveValue('123')
  })

  it('keeps an existing current price when a fresh price arrives', async () => {
    const seeded = await seedAsset({
      autoPrice: true,
      currentPrice: 500,
      binanceSymbol: 'BTCUSDT',
    })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    await renderForm(seeded)

    await waitFor(() => expect(priceState.keys.has('binance:BTCUSDT')).toBe(true))
    expect(screen.getByLabelText('Current price')).toHaveValue('500')
  })

  it('saves the auto price toggle and mapping round-trip', async () => {
    const seeded = await seedAsset({
      autoPrice: true,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    await renderForm(seeded)

    await user.click(screen.getByRole('radio', { name: 'Manual' }))

    const [asset] = await saveChanges(user)
    expect(asset).toMatchObject({
      autoPrice: false,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
  })

  it('clears a machine-prefilled current price when the symbol changes', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    symbolState.bySymbol.set('ETH', [ethereumCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    await renderForm(null)

    const symbolInput = screen.getByLabelText('Symbol')
    await user.type(symbolInput, 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue('68000'))

    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')

    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue(''))
  })

  it('clears a machine-prefilled current price when the market changes', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue('68000'))

    await user.selectOptions(screen.getByLabelText('Market'), 'forex')

    expect(screen.getByLabelText('Current price')).toHaveValue('')
  })

  it('prefills the new symbol price after a symbol change', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    symbolState.bySymbol.set('ETH', [ethereumCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    priceState.prices.set(
      'binance:ETHUSDT',
      freshPrice({ key: 'binance:ETHUSDT', symbol: 'ETH', price: 2500 }),
    )
    const user = userEvent.setup()
    await renderForm(null)

    const symbolInput = screen.getByLabelText('Symbol')
    await user.type(symbolInput, 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue('68000'))

    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')

    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue('2500'))
  })

  it('re-prefills when the mapping changes for the same symbol', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [
      binanceCandidate(),
      binanceCandidate({
        provider: 'coingecko',
        priceId: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        quote: null,
        rank: 1,
        binanceSymbol: null,
        coingeckoId: 'bitcoin',
      }),
    ])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    priceState.prices.set(
      'coingecko:bitcoin',
      freshPrice({ key: 'coingecko:bitcoin', provider: 'coingecko', price: 67000 }),
    )
    const user = userEvent.setup()
    await renderForm(null)

    await user.type(screen.getByLabelText('Symbol'), 'BTC')
    const picker = await screen.findByLabelText('Market symbol')
    await user.selectOptions(picker, 'binance:BTCUSDT')
    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue('68000'))

    await user.selectOptions(picker, 'coingecko:bitcoin')
    await waitFor(() => expect(screen.getByLabelText('Current price')).toHaveValue('67000'))
  })

  it('drops a stale mapping when the symbol changes to an unresolvable one', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    const symbolInput = screen.getByLabelText('Symbol')
    await user.type(symbolInput, 'BTC')
    await user.selectOptions(await screen.findByLabelText('Market symbol'), 'coingecko:bitcoin')

    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')
    await screen.findByText(
      'No live price found for this symbol. You can still save and enter a price manually.',
    )

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.type(screen.getByLabelText('Average cost'), '100')

    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({
      symbol: 'ETH',
      binanceSymbol: null,
      coingeckoId: null,
    })
  })

  it('drops a stored mapping when an edited asset changes symbol', async () => {
    const seeded = await seedAsset({
      autoPrice: true,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
    const user = userEvent.setup()
    await renderForm(seeded)

    const symbolInput = screen.getByLabelText('Symbol')
    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')
    await screen.findByText(
      'No live price found for this symbol. You can still save and enter a price manually.',
    )

    const [asset] = await saveChanges(user)
    expect(asset).toMatchObject({
      symbol: 'ETH',
      binanceSymbol: null,
      coingeckoId: null,
    })
  })

  it('resolves a new mapping after the symbol changes', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    symbolState.bySymbol.set('ETH', [ethereumCandidate()])
    const user = userEvent.setup()
    await renderForm(null)

    const symbolInput = screen.getByLabelText('Symbol')
    await user.type(symbolInput, 'BTC')
    await user.selectOptions(await screen.findByLabelText('Market symbol'), 'coingecko:bitcoin')

    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')
    await waitFor(() => expect(priceState.keys.has('binance:ETHUSDT')).toBe(true))

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.type(screen.getByLabelText('Average cost'), '100')

    const [asset] = await saveNewAsset(user)
    expect(asset).toMatchObject({
      symbol: 'ETH',
      binanceSymbol: 'ETHUSDT',
      coingeckoId: null,
    })
  })
})
