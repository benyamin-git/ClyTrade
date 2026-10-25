import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PriceAlert, PriceAlertDraft } from '@/data/models/price'
import { createAlert, listAlerts, replaceAllAlerts } from '@/data/repositories/alerts.repo'
import { I18nProvider } from '@/i18n/I18nProvider'
import { AlertsPage } from './AlertsPage'

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

function renderPage(locale: 'en' | 'fa' = 'en') {
  return render(
    <I18nProvider preference={locale}>
      <AlertsPage />
    </I18nProvider>,
  )
}

afterEach(() => {
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

beforeEach(async () => {
  await replaceAllAlerts([])
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
})
