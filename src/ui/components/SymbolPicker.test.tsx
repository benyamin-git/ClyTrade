import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { SymbolPicker } from './SymbolPicker'
import type { SymbolCandidate } from '@/market/symbols'

const candidates: SymbolCandidate[] = [
  {
    provider: 'binance',
    priceId: 'BTCUSDT',
    symbol: 'BTCUSDT',
    name: null,
    quote: 'USDT',
    rank: null,
    binanceSymbol: 'BTCUSDT',
    coingeckoId: 'bitcoin',
  },
  {
    provider: 'coingecko',
    priceId: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    quote: null,
    rank: 2,
    binanceSymbol: 'ETHUSDT',
    coingeckoId: 'ethereum',
  },
]

function renderPicker(value: SymbolCandidate | null = null) {
  const onChange = vi.fn()
  render(
    <I18nProvider>
      <SymbolPicker label="Coin" candidates={candidates} value={value} onChange={onChange} />
    </I18nProvider>,
  )
  return onChange
}

describe('SymbolPicker', () => {
  it('renders provider-aware options with an accessible label', () => {
    renderPicker()

    const select = screen.getByLabelText('Coin')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Select a symbol' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'BTCUSDT — BTCUSDT (Binance)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'ETH — Ethereum (CoinGecko)' })).toBeInTheDocument()
  })

  it('reports the selected candidate', async () => {
    const user = userEvent.setup()
    const onChange = renderPicker()

    await user.selectOptions(screen.getByLabelText('Coin'), 'coingecko:ethereum')

    expect(onChange).toHaveBeenCalledWith(candidates[1])
  })

  it('reports null when the placeholder is selected', async () => {
    const user = userEvent.setup()
    const onChange = renderPicker(candidates[0] ?? null)

    await user.selectOptions(screen.getByLabelText('Coin'), '')

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows an empty hint when there are no candidates', () => {
    render(
      <I18nProvider>
        <SymbolPicker label="Coin" candidates={[]} value={null} onChange={() => {}} />
      </I18nProvider>,
    )

    expect(screen.getByText('No symbols found.')).toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(
      <I18nProvider>
        <SymbolPicker
          label="Coin"
          candidates={candidates}
          value={null}
          onChange={() => {}}
          disabled
        />
      </I18nProvider>,
    )

    expect(screen.getByLabelText('Coin')).toBeDisabled()
  })

  it('localizes provider labels in Persian', () => {
    render(
      <I18nProvider preference="fa">
        <SymbolPicker label="Coin" candidates={candidates} value={null} onChange={() => {}} />
      </I18nProvider>,
    )

    expect(screen.getByRole('option', { name: 'BTCUSDT — BTCUSDT (بایننس)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'ETH — Ethereum (کوین‌گکو)' })).toBeInTheDocument()
  })
})
