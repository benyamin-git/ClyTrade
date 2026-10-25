import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsI18nBridge } from '@/app/SettingsI18nBridge'
import type { Market } from '@/data/models/market'
import { DEFAULT_PREFERENCES } from '@/data/models/settings'
import type { Trade, TradeDraft } from '@/data/models/trade'
import { clearSettings, setPreferences } from '@/data/repositories/settings.repo'
import { clearTrades, createTrade, listTrades } from '@/data/repositories/trades.repo'
import { PreferencesGate } from '@/features/settings/components/PreferencesGate'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import type { SymbolCandidate } from '@/market/symbols'
import type { ProviderPrice } from '@/market/types'
import { TradeFormSheet } from './TradeFormSheet'

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
        error: null,
      },
      refresh: async () => undefined,
    }
  },
}))

beforeEach(() => {
  symbolState.bySymbol.clear()
  priceState.prices.clear()
  priceState.keys.clear()
  priceState.reasons.clear()
})

function makeTrade(market: Market, overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'trade-1',
    symbol: 'BTCUSDT',
    market,
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
    autoClose: false,
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

function coinGeckoCandidate(overrides: Partial<SymbolCandidate> = {}): SymbolCandidate {
  return binanceCandidate({
    provider: 'coingecko',
    priceId: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    quote: null,
    rank: 1,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    ...overrides,
  })
}

function coinGeckoOnlyCandidate(): SymbolCandidate {
  return coinGeckoCandidate({ binanceSymbol: null })
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

async function seedTrade(overrides: Partial<TradeDraft> = {}): Promise<Trade> {
  return createTrade({
    symbol: 'BTCUSDT',
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
    autoClose: false,
    binanceSymbol: null,
    coingeckoId: null,
    ...overrides,
  })
}

async function savedTrades(): Promise<Trade[]> {
  await waitFor(async () => {
    expect(await listTrades()).toHaveLength(1)
  })
  return listTrades()
}

async function saveNewTrade(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Add trade' }))
  return savedTrades()
}

async function saveChanges(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  return savedTrades()
}

function renderForm(trade: Trade | null, onSaved?: () => void) {
  render(
    <SettingsProvider>
      <SettingsI18nBridge>
        <PreferencesGate>
          <TradeFormSheet trade={trade} onClose={() => undefined} onSaved={onSaved} />
        </PreferencesGate>
      </SettingsI18nBridge>
    </SettingsProvider>,
  )
}

describe('TradeFormSheet market field', () => {
  beforeEach(async () => {
    await clearSettings()
  })

  it('prefills the market from preferences for a new trade', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'forex' })
    renderForm(null)

    expect(await screen.findByLabelText('Market')).toHaveValue('forex')
  })

  it('shows the market of an existing trade', async () => {
    renderForm(makeTrade('stocks'))

    expect(await screen.findByLabelText('Market')).toHaveValue('stocks')
  })
})

describe('TradeFormSheet validation', () => {
  beforeEach(async () => {
    await clearSettings()
    await clearTrades()
  })

  async function fillRequiredFields() {
    await userEvent.type(await screen.findByLabelText('Symbol'), 'ETHUSDT')
    await userEvent.type(screen.getByLabelText('Entry price'), '100')
    await userEvent.type(screen.getByLabelText('Size'), '1')
  }

  function setDate(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }

  function save() {
    fireEvent.click(screen.getByRole('button', { name: 'Add trade' }))
  }

  it('saves an exit price with a closed date as closed', async () => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Exit price'), '110')
    setDate('Opened', '2026-01-05')
    setDate('Closed', '2026-01-06')
    save()

    await waitFor(async () => {
      expect(await listTrades()).toHaveLength(1)
    })
    const [saved] = await listTrades()
    expect(saved?.status).toBe('closed')
    expect(saved?.exitPrice).toBe(110)
    expect(saved?.closedAt).not.toBeNull()
  })

  it('rejects an exit price without a closed date', async () => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Exit price'), '110')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A closed date is required when an exit price is set.',
    )
    expect(await listTrades()).toEqual([])
  })

  it('rejects a closed date without an exit price', async () => {
    renderForm(null)
    await fillRequiredFields()
    setDate('Opened', '2026-01-05')
    setDate('Closed', '2026-01-06')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An exit price is required when a closed date is set.',
    )
    expect(await listTrades()).toEqual([])
  })

  it('rejects a closed date before the opened date', async () => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Exit price'), '110')
    setDate('Opened', '2026-01-06')
    setDate('Closed', '2026-01-05')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Closed date cannot be before the opened date.',
    )
    expect(await listTrades()).toEqual([])
  })

  it.each([
    ['Exit price', 'Exit price must be greater than 0.'],
    ['Stop price', 'Stop price must be greater than 0.'],
    ['Target price', 'Target price must be greater than 0.'],
  ])('rejects zero in the %s field', async (label, message) => {
    renderForm(null)
    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText(label), '0')
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(await listTrades()).toEqual([])
  })

  it('rejects negative fees', async () => {
    renderForm(null)
    await fillRequiredFields()
    fireEvent.change(screen.getByLabelText('Fees (total)'), { target: { value: '-1' } })
    save()

    expect(await screen.findByRole('alert')).toHaveTextContent('Fees cannot be negative.')
    expect(await listTrades()).toEqual([])
  })

  it('splits tags on both comma characters', async () => {
    renderForm(null)
    await fillRequiredFields()
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'scalp، btc, swing' } })
    save()

    await waitFor(async () => {
      expect(await listTrades()).toHaveLength(1)
    })
    const [saved] = await listTrades()
    expect(saved?.tags).toEqual(['scalp', 'btc', 'swing'])
  })
})

describe('TradeFormSheet auto-close', () => {
  beforeEach(async () => {
    await clearSettings()
    await clearTrades()
  })

  it('defaults auto-close from preferences for a new trade', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, autoCloseByDefault: true })
    const user = userEvent.setup()
    renderForm(null)

    const group = await screen.findByRole('radiogroup', { name: 'Auto-close' })
    expect(within(group).getByRole('radio', { name: 'Included' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(
      screen.getByText(
        'Closes this trade when its target or stop is reached. Needs a fresh live price.',
      ),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Symbol'), 'ETHUSDT')
    await user.type(screen.getByLabelText('Entry price'), '100')
    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(trade?.autoClose).toBe(true)
  })

  it('keeps the stored auto-close setting when editing', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, autoCloseByDefault: true })
    const seeded = await seedTrade({ autoClose: false })
    const user = userEvent.setup()
    renderForm(seeded)

    const group = await screen.findByRole('radiogroup', { name: 'Auto-close' })
    expect(within(group).getByRole('radio', { name: 'Excluded' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    const [trade] = await saveChanges(user)
    expect(trade?.autoClose).toBe(false)
  })

  it('saves auto-close on for a new trade', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'ETHUSDT')
    await user.type(screen.getByLabelText('Entry price'), '100')
    await user.type(screen.getByLabelText('Size'), '1')
    await user.click(screen.getByRole('radio', { name: 'Included' }))

    const [trade] = await saveNewTrade(user)
    expect(trade?.autoClose).toBe(true)
  })

  it('saves auto-close off when editing', async () => {
    const seeded = await seedTrade({ autoClose: true })
    const user = userEvent.setup()
    renderForm(seeded)

    await screen.findByLabelText('Symbol')
    await user.click(screen.getByRole('radio', { name: 'Excluded' }))

    const [trade] = await saveChanges(user)
    expect(trade?.autoClose).toBe(false)
  })

  it('saves auto-close and the symbol mapping round-trip', async () => {
    const seeded = await seedTrade({
      autoClose: true,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
    symbolState.bySymbol.set('BTCUSDT', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    renderForm(seeded)

    await screen.findByLabelText('Symbol')
    await user.click(screen.getByRole('radio', { name: 'Excluded' }))

    const [trade] = await saveChanges(user)
    expect(trade).toMatchObject({
      autoClose: false,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
  })
})

describe('TradeFormSheet symbol mapping and entry prefill', () => {
  beforeEach(async () => {
    await clearSettings()
    await clearTrades()
  })

  it('shows the picker for ambiguous candidates and saves the chosen mapping', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'BTC')
    await user.selectOptions(await screen.findByLabelText('Market symbol'), 'coingecko:bitcoin')
    await user.type(screen.getByLabelText('Entry price'), '100')
    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(trade).toMatchObject({
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
  })

  it('selects a single preferred candidate automatically', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'BTC')
    await waitFor(() => expect(priceState.keys.has('binance:BTCUSDT')).toBe(true))
    expect(screen.queryByLabelText('Market symbol')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Entry price'), '100')
    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(trade).toMatchObject({ binanceSymbol: 'BTCUSDT', coingeckoId: null })
  })

  it('shows the price unavailable hint when no symbol matches and still saves', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [])
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'BTC')
    expect(
      await screen.findByText(
        'No live price found for this symbol. You can still save and enter a price manually.',
      ),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Entry price'), '100')
    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(priceState.keys.size).toBe(0)
    expect(trade).toMatchObject({ binanceSymbol: null, coingeckoId: null })
  })

  it('does not map or request prices for a non-crypto trade', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'forex' })
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'EURUSD')
    expect(screen.getByRole('radiogroup', { name: 'Auto-close' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Market symbol')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'No live price found for this symbol. You can still save and enter a price manually.',
      ),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Entry price'), '1.1')
    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(priceState.keys.size).toBe(0)
    expect(trade).toMatchObject({
      market: 'forex',
      binanceSymbol: null,
      coingeckoId: null,
    })
  })

  it('prefills an empty entry price from a fresh price', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Entry price')).toHaveValue('68000'))
    expect(priceState.reasons.has('detail')).toBe(true)
    expect(screen.getByText('Current price: 68,000')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(trade?.entryPrice).toBe(68000)
  })

  it('does not overwrite an entry price the user typed', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'BTC')
    const entryInput = screen.getByLabelText('Entry price')
    await user.type(entryInput, '123')

    priceState.prices.set('binance:BTCUSDT', freshPrice())
    await user.type(screen.getByLabelText('Size'), '1')

    expect(entryInput).toHaveValue('123')
    const [trade] = await saveNewTrade(user)
    expect(trade?.entryPrice).toBe(123)
  })

  it('keeps an existing entry price when a fresh price arrives', async () => {
    const seeded = await seedTrade({ entryPrice: 100, binanceSymbol: 'BTCUSDT' })
    symbolState.bySymbol.set('BTCUSDT', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    renderForm(seeded)

    await screen.findByLabelText('Symbol')
    await waitFor(() => expect(priceState.keys.has('binance:BTCUSDT')).toBe(true))
    expect(screen.getByLabelText('Entry price')).toHaveValue('100')
  })

  it('clears a machine-prefilled entry price when the symbol changes', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    symbolState.bySymbol.set('ETH', [])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    renderForm(null)

    const symbolInput = await screen.findByLabelText('Symbol')
    await user.type(symbolInput, 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Entry price')).toHaveValue('68000'))

    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')
    await waitFor(() => expect(screen.getByLabelText('Entry price')).toHaveValue(''))

    await user.type(screen.getByLabelText('Entry price'), '2500')
    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(trade).toMatchObject({
      symbol: 'ETH',
      entryPrice: 2500,
      binanceSymbol: null,
      coingeckoId: null,
    })
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
    renderForm(null)

    const symbolInput = await screen.findByLabelText('Symbol')
    await user.type(symbolInput, 'BTC')
    await waitFor(() => expect(screen.getByLabelText('Entry price')).toHaveValue('68000'))

    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')
    await waitFor(() => expect(screen.getByLabelText('Entry price')).toHaveValue('2500'))

    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(trade).toMatchObject({
      symbol: 'ETH',
      entryPrice: 2500,
      binanceSymbol: 'ETHUSDT',
      coingeckoId: null,
    })
  })

  it('clears and re-prefills when the mapping changes for the same symbol', async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, defaultMarket: 'crypto' })
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoOnlyCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    priceState.prices.set(
      'coingecko:bitcoin',
      freshPrice({ key: 'coingecko:bitcoin', provider: 'coingecko', price: 67000 }),
    )
    const user = userEvent.setup()
    renderForm(null)

    await user.type(await screen.findByLabelText('Symbol'), 'BTC')
    const picker = await screen.findByLabelText('Market symbol')
    await user.selectOptions(picker, 'binance:BTCUSDT')
    await waitFor(() => expect(screen.getByLabelText('Entry price')).toHaveValue('68000'))

    await user.selectOptions(picker, 'coingecko:bitcoin')
    await waitFor(() => expect(screen.getByLabelText('Entry price')).toHaveValue('67000'))

    await user.type(screen.getByLabelText('Size'), '1')

    const [trade] = await saveNewTrade(user)
    expect(trade).toMatchObject({
      entryPrice: 67000,
      binanceSymbol: null,
      coingeckoId: 'bitcoin',
    })
  })

  it('drops a stored mapping when an edited trade changes symbol', async () => {
    const seeded = await seedTrade({
      autoClose: true,
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
    })
    symbolState.bySymbol.set('ETH', [])
    const user = userEvent.setup()
    renderForm(seeded)

    const symbolInput = await screen.findByLabelText('Symbol')
    await user.clear(symbolInput)
    await user.type(symbolInput, 'ETH')
    await screen.findByText(
      'No live price found for this symbol. You can still save and enter a price manually.',
    )

    const [trade] = await saveChanges(user)
    expect(trade).toMatchObject({
      symbol: 'ETH',
      binanceSymbol: null,
      coingeckoId: null,
    })
  })
})

describe('TradeFormSheet onSaved', () => {
  beforeEach(async () => {
    await clearSettings()
    await clearTrades()
  })

  it('calls onSaved after a successful edit', async () => {
    const seeded = await seedTrade()
    const user = userEvent.setup()
    const onSaved = vi.fn()
    renderForm(seeded, onSaved)

    await screen.findByLabelText('Symbol')
    await saveChanges(user)

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
  })

  it('does not call onSaved when validation fails', async () => {
    const seeded = await seedTrade()
    const user = userEvent.setup()
    const onSaved = vi.fn()
    renderForm(seeded, onSaved)

    const entry = await screen.findByLabelText('Entry price')
    await user.clear(entry)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Entry price must be greater than 0.')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
