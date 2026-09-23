import { describe, expect, it } from 'vitest'
import { CURRENCIES, currencySymbol } from './currency'

describe('currencySymbol', () => {
  it.each([
    ['USD', '$'],
    ['EUR', '€'],
    ['GBP', '£'],
    ['JPY', '¥'],
    ['CHF', 'Fr'],
    ['CAD', 'C$'],
    ['AUD', 'A$'],
    ['CNY', 'CN¥'],
    ['INR', '₹'],
    ['BRL', 'R$'],
    ['KRW', '₩'],
    ['TRY', '₺'],
  ])('maps %s to %s', (code, symbol) => {
    expect(currencySymbol(code)).toBe(symbol)
  })

  it('accepts lowercase codes', () => {
    expect(currencySymbol('usd')).toBe('$')
  })

  it('falls back to the uppercased code for unknown currencies', () => {
    expect(currencySymbol('xyz')).toBe('XYZ')
  })

  it('has unique codes and symbols', () => {
    expect(new Set(CURRENCIES.map((currency) => currency.code)).size).toBe(CURRENCIES.length)
    expect(new Set(CURRENCIES.map((currency) => currency.symbol)).size).toBe(CURRENCIES.length)
  })
})
