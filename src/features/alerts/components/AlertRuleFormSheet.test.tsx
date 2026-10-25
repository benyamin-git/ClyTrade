import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PriceAlert, PriceAlertDraft } from '@/data/models/price'
import { createAlert, listAlerts, replaceAllAlerts } from '@/data/repositories/alerts.repo'
import { I18nProvider } from '@/i18n/I18nProvider'
import type { SymbolCandidate } from '@/market/symbols'
import type { ProviderPrice } from '@/market/types'
import { AlertRuleFormSheet } from './AlertRuleFormSheet'

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

function alertDraft(overrides: Partial<PriceAlertDraft> = {}): PriceAlertDraft {
  return {
    kind: 'price',
    symbol: 'BTC',
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
    priceMode: 'above',
    level: 68000,
    rangeLow: null,
    rangeHigh: null,
    percent: null,
    percentDirection: null,
    repeat: 'once',
    cooldownMinutes: 60,
    referencePrice: null,
    lastPrice: null,
    armed: true,
    enabled: true,
    note: null,
    lastFiredAt: null,
    ...overrides,
  }
}

async function seedAlert(overrides: Partial<PriceAlertDraft> = {}): Promise<PriceAlert> {
  return createAlert(alertDraft(overrides))
}

async function renderForm(alert: PriceAlert | null) {
  const onClose = vi.fn()
  render(
    <I18nProvider preference="en">
      <AlertRuleFormSheet alert={alert} onClose={onClose} />
    </I18nProvider>,
  )
  await screen.findByLabelText('Coin')
  return { onClose }
}

async function enterSymbol(
  user: ReturnType<typeof userEvent.setup>,
  symbol = 'BTC',
  refKey = 'binance:BTCUSDT',
) {
  await user.type(screen.getByLabelText('Coin'), symbol)
  await waitFor(() => expect(priceState.keys.has(refKey)).toBe(true))
}

async function createRule(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Create alert' }))
}

async function saveChanges(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
}

async function savedAlerts(): Promise<PriceAlert[]> {
  await waitFor(async () => {
    expect(await listAlerts()).toHaveLength(1)
  })
  return listAlerts()
}

afterEach(() => {
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

beforeEach(async () => {
  await replaceAllAlerts([])
  symbolState.bySymbol.clear()
  priceState.prices.clear()
  priceState.keys.clear()
  priceState.reasons.clear()
})

describe('AlertRuleFormSheet price rules', () => {
  it('creates an above rule with the selected provider ids and alert defaults', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.type(screen.getByLabelText('Level'), '68000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({
      kind: 'price',
      symbol: 'BTC',
      binanceSymbol: 'BTCUSDT',
      coingeckoId: null,
      priceMode: 'above',
      level: 68000,
      rangeLow: null,
      rangeHigh: null,
      percent: null,
      percentDirection: null,
      repeat: 'once',
      cooldownMinutes: 60,
      referencePrice: null,
      lastPrice: null,
      armed: true,
      enabled: true,
      note: null,
      lastFiredAt: null,
    })
    expect(priceState.reasons.has('detail')).toBe(true)
  })

  it.each([
    ['Below', 'below'],
    ['Crossing', 'crossing'],
  ] as const)('creates a %s price rule', async (label, mode) => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.selectOptions(screen.getByLabelText('Price mode'), label)
    await user.type(screen.getByLabelText('Level'), '65000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ priceMode: mode, level: 65000, rangeLow: null, rangeHigh: null })
  })

  it('creates a range rule and stores both bounds', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.selectOptions(screen.getByLabelText('Price mode'), 'Range')
    await user.type(screen.getByLabelText('Range low'), '60000')
    await user.type(screen.getByLabelText('Range high'), '70000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({
      priceMode: 'range',
      level: null,
      rangeLow: 60000,
      rangeHigh: 70000,
    })
  })

  it('saves the chosen candidate when the symbol is ambiguous', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate(), coinGeckoCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await user.type(screen.getByLabelText('Coin'), 'BTC')
    await user.selectOptions(await screen.findByLabelText('Market symbol'), 'coingecko:bitcoin')
    await user.type(screen.getByLabelText('Level'), '68000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ binanceSymbol: 'BTCUSDT', coingeckoId: 'bitcoin' })
  })
})

describe('AlertRuleFormSheet percent rules', () => {
  it.each([
    ['Up', 'up'],
    ['Down', 'down'],
    ['Either', 'both'],
  ] as const)(
    'creates a %s percent rule with the current price as reference',
    async (label, dir) => {
      symbolState.bySymbol.set('BTC', [binanceCandidate()])
      priceState.prices.set('binance:BTCUSDT', freshPrice())
      const user = userEvent.setup()
      const { onClose } = await renderForm(null)

      await enterSymbol(user)
      await user.click(screen.getByRole('radio', { name: 'Percent' }))
      await user.selectOptions(screen.getByLabelText('Direction'), label)
      await user.type(screen.getByLabelText('Change'), '5')
      expect(screen.getByText('Reference price: 68,000')).toBeInTheDocument()
      await createRule(user)

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
      const [alert] = await savedAlerts()
      expect(alert).toMatchObject({
        kind: 'percent',
        priceMode: null,
        level: null,
        rangeLow: null,
        rangeHigh: null,
        percent: 5,
        percentDirection: dir,
        referencePrice: 68000,
      })
    },
  )

  it('blocks a percent rule when no price is available', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.click(screen.getByRole('radio', { name: 'Percent' }))
    await user.type(screen.getByLabelText('Change'), '5')
    expect(
      screen.getByText(
        'No current price for this coin yet. A percent rule needs a price before it can be saved.',
      ),
    ).toBeInTheDocument()
    await createRule(user)

    expect(
      await screen.findByText('A percent rule needs a current price for this symbol.'),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(await listAlerts()).toHaveLength(0)
  })

  it('saves a price rule without a current price when a mapping exists', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.type(screen.getByLabelText('Level'), '68000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ kind: 'price', referencePrice: null })
  })

  it('shows the current price hint for price rules', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    await renderForm(null)

    await enterSymbol(user)

    expect(screen.getByText('Current price: 68,000')).toBeInTheDocument()
  })
})

describe('AlertRuleFormSheet repeat modes', () => {
  it('defaults to once and hides the cooldown field', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    expect(screen.getByRole('radio', { name: 'Once' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByLabelText('Cooldown (minutes)')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Level'), '68000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ repeat: 'once', cooldownMinutes: 60 })
  })

  it('saves cross-back without showing the cooldown field', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.click(screen.getByRole('radio', { name: 'Cross-back' }))
    expect(screen.queryByLabelText('Cooldown (minutes)')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Level'), '68000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ repeat: 'cross-back', cooldownMinutes: 60 })
  })

  it('shows and saves the cooldown field for cooldown rules', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.click(screen.getByRole('radio', { name: 'Cooldown' }))
    const cooldown = screen.getByLabelText('Cooldown (minutes)')
    expect(cooldown).toHaveValue('60')
    await user.clear(cooldown)
    await user.type(cooldown, '90')
    await user.type(screen.getByLabelText('Level'), '68000')
    await createRule(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ repeat: 'cooldown', cooldownMinutes: 90 })
  })
})

describe('AlertRuleFormSheet validation', () => {
  it('rejects a missing coin', async () => {
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await createRule(user)

    expect(await screen.findByText('Choose a coin and its market symbol.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(await listAlerts()).toHaveLength(0)
  })

  it('rejects a range whose low is not below the high', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.selectOptions(screen.getByLabelText('Price mode'), 'Range')
    await user.type(screen.getByLabelText('Range low'), '70000')
    await user.type(screen.getByLabelText('Range high'), '60000')
    await createRule(user)

    expect(
      await screen.findByText('The range low must be below the range high.'),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(await listAlerts()).toHaveLength(0)
  })

  it('rejects a percent over 1000', async () => {
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    const { onClose } = await renderForm(null)

    await enterSymbol(user)
    await user.click(screen.getByRole('radio', { name: 'Percent' }))
    await user.type(screen.getByLabelText('Change'), '1001')
    await createRule(user)

    expect(await screen.findByText('The percent change cannot exceed 1000%.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(await listAlerts()).toHaveLength(0)
  })
})

describe('AlertRuleFormSheet editing', () => {
  it('reconstructs the stored candidate and updates an existing rule', async () => {
    const seeded = await seedAlert({
      level: 50000,
      note: 'old note',
      repeat: 'cooldown',
      cooldownMinutes: 30,
    })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(seeded)

    expect(screen.getByLabelText('Coin')).toHaveValue('BTC')
    expect(screen.getByLabelText('Price mode')).toHaveValue('above')
    expect(screen.getByLabelText('Level')).toHaveValue('50000')
    expect(screen.getByRole('radio', { name: 'Cooldown' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Cooldown (minutes)')).toHaveValue('30')
    expect(screen.getByLabelText('Note')).toHaveValue('old note')
    expect(priceState.keys.has('binance:BTCUSDT')).toBe(true)

    await user.clear(screen.getByLabelText('Level'))
    await user.type(screen.getByLabelText('Level'), '70000')
    await user.clear(screen.getByLabelText('Note'))
    await user.type(screen.getByLabelText('Note'), 'new note')
    await saveChanges(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({
      id: seeded.id,
      symbol: 'BTC',
      binanceSymbol: 'BTCUSDT',
      coingeckoId: 'bitcoin',
      level: 70000,
      note: 'new note',
      repeat: 'cooldown',
      cooldownMinutes: 30,
      enabled: true,
      armed: true,
    })
  })

  it('resets a percent reference to the current cached price on edit', async () => {
    const seeded = await seedAlert({
      kind: 'percent',
      priceMode: null,
      level: null,
      percent: 5,
      percentDirection: 'up',
      referencePrice: 100,
    })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    priceState.prices.set('binance:BTCUSDT', freshPrice())
    const user = userEvent.setup()
    const { onClose } = await renderForm(seeded)

    expect(screen.getByText('Reference price: 68,000')).toBeInTheDocument()
    await saveChanges(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ id: seeded.id, referencePrice: 68000, percent: 5 })
  })

  it('re-enables a paused rule when it is saved', async () => {
    const seeded = await seedAlert({ enabled: false })
    symbolState.bySymbol.set('BTC', [binanceCandidate()])
    const user = userEvent.setup()
    const { onClose } = await renderForm(seeded)

    await saveChanges(user)

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    const [alert] = await savedAlerts()
    expect(alert).toMatchObject({ id: seeded.id, enabled: true })
  })
})
