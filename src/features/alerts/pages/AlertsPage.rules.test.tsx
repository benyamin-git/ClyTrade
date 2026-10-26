import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PriceAlert, PriceAlertDraft } from '@/data/models/price'
import type { Trade, TradeDraft } from '@/data/models/trade'
import {
  createAlert,
  listAlerts,
  replaceAllAlertEvents,
  replaceAllAlerts,
} from '@/data/repositories/alerts.repo'
import { createTrade, replaceAllTrades } from '@/data/repositories/trades.repo'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import type { SchedulerStatus } from '@/market/scheduler'
import { AlertsPage } from './AlertsPage'

const NOW = 1_700_000_000_000

const priceState = vi.hoisted(() => ({
  status: {
    provider: 'auto',
    activeProvider: null,
    lastSuccessAt: null,
    nextAllowedAt: null,
    monthlyUsage: null,
    error: null,
  } as SchedulerStatus,
}))

vi.mock('@/market/usePrices', () => ({
  usePrices: () => ({
    prices: new Map(),
    status: priceState.status,
    refresh: async () => undefined,
  }),
}))

vi.mock('@/market/symbols', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/market/symbols')>()
  return { ...actual, resolveSymbol: async () => [] }
})

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

function tradeDraft(overrides: Partial<TradeDraft> = {}): TradeDraft {
  return {
    symbol: 'BTC',
    market: 'crypto',
    direction: 'long',
    status: 'open',
    entryPrice: 65000,
    exitPrice: null,
    size: 1,
    leverage: 1,
    stopPrice: 60000,
    targetPrice: 70000,
    fees: 0,
    openedAt: NOW - 3_600_000,
    closedAt: null,
    strategy: null,
    notes: null,
    tags: [],
    autoClose: false,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: null,
    ...overrides,
  }
}

async function seedTrade(overrides: Partial<TradeDraft> = {}): Promise<Trade> {
  return createTrade(tradeDraft(overrides))
}

function renderPage(locale: 'en' | 'fa' = 'en') {
  return render(
    <SettingsProvider>
      <I18nProvider preference={locale}>
        <AlertsPage />
      </I18nProvider>
    </SettingsProvider>,
  )
}

afterEach(() => {
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

beforeEach(async () => {
  await replaceAllAlerts([])
  await replaceAllTrades([])
  await replaceAllAlertEvents([])
  priceState.status = {
    provider: 'auto',
    activeProvider: null,
    lastSuccessAt: null,
    nextAllowedAt: null,
    monthlyUsage: null,
    error: null,
  }
})

describe('AlertsPage rule rows', () => {
  it('lists a rule with its summary and pauses and resumes it', async () => {
    await seedAlert()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Above 68,000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit BTC alert' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pause BTC alert' }))
    await waitFor(async () => {
      expect((await listAlerts())[0]?.enabled).toBe(false)
    })
    expect(await screen.findByText('Paused')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resume BTC alert' }))
    await waitFor(async () => {
      expect((await listAlerts())[0]?.enabled).toBe(true)
    })
    expect(screen.queryByText('Paused')).not.toBeInTheDocument()
  })

  it('describes percent and range rules', async () => {
    await seedAlert({
      kind: 'percent',
      priceMode: null,
      level: null,
      percent: 5,
      percentDirection: 'down',
      referencePrice: 68000,
    })
    await seedAlert({
      symbol: 'ETH',
      binanceSymbol: 'ETHUSDT',
      coingeckoId: null,
      priceMode: 'range',
      level: null,
      rangeLow: 2000,
      rangeHigh: 3000,
    })
    renderPage()

    expect(await screen.findByText('Down 5%')).toBeInTheDocument()
    expect(await screen.findByText('Outside 2,000 – 3,000')).toBeInTheDocument()
  })

  it('shows repeat mode, last fired time and reference price', async () => {
    await seedAlert({
      kind: 'percent',
      priceMode: null,
      level: null,
      percent: 5,
      percentDirection: 'up',
      repeat: 'cooldown',
      referencePrice: 68000,
      lastFiredAt: NOW,
    })
    renderPage()

    expect(await screen.findByText('Up 5%')).toBeInTheDocument()
    expect(screen.getByText('Repeat: Cooldown')).toBeInTheDocument()
    expect(screen.getByText(/Last fired/)).toBeInTheDocument()
    expect(screen.getByText('Reference 68,000')).toBeInTheDocument()
  })

  it('opens the rule form when editing a rule', async () => {
    await seedAlert()
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit BTC alert' }))
    expect(await screen.findByRole('dialog', { name: 'Edit BTC alert' })).toBeInTheDocument()
  })

  it('deletes a rule after confirmation', async () => {
    await seedAlert()
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Delete BTC alert' }))
    expect(await screen.findByRole('dialog', { name: 'Delete alert' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(async () => {
      expect(await listAlerts()).toHaveLength(0)
    })
    expect(screen.queryByText('Above 68,000')).not.toBeInTheDocument()
    expect(screen.getByText('No alert rules yet')).toBeInTheDocument()
  })

  it('renders the new alert action inside the rules region', () => {
    renderPage()

    const region = screen.getByTestId('alerts-rules')
    expect(region).toContainElement(screen.getByRole('button', { name: 'New alert' }))
  })

  it('lists open trade levels as read-only rows that open the trade form', async () => {
    await seedTrade()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Target 70,000 · Stop 60,000')).toBeInTheDocument()
    expect(screen.getByText('Journal trade')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause BTC alert' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete BTC alert' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit BTC trade' }))
    expect(await screen.findByRole('dialog', { name: 'Edit BTC' })).toBeInTheDocument()
  })

  it('shows a single trade level when only one is set', async () => {
    await seedTrade({ stopPrice: null })
    renderPage()

    expect(await screen.findByText('Target 70,000')).toBeInTheDocument()
    expect(screen.queryByText(/Stop 60,000/)).not.toBeInTheDocument()
  })

  it('ignores closed trades and open trades without levels', async () => {
    await seedTrade({
      symbol: 'ETH',
      status: 'closed',
      exitPrice: 70000,
      closedAt: NOW,
      binanceSymbol: 'ETHUSDT',
    })
    await seedTrade({
      symbol: 'SOL',
      stopPrice: null,
      targetPrice: null,
      binanceSymbol: 'SOLUSDT',
    })
    renderPage()

    await screen.findByText('No alert rules yet')
    expect(screen.queryByText('Journal trade')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit ETH trade' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit SOL trade' })).not.toBeInTheDocument()
  })
})
