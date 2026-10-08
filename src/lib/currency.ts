export interface CurrencyDef {
  code: string
  symbol: string
  customSymbol?: boolean
}

export const CURRENCIES: readonly CurrencyDef[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CHF', symbol: 'Fr' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CNY', symbol: 'CN¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'BRL', symbol: 'R$' },
  { code: 'KRW', symbol: '₩' },
  { code: 'TRY', symbol: '₺' },
  { code: 'IRT', symbol: 'تومان', customSymbol: true },
]

export const DEFAULT_CURRENCY = 'USD'

const BY_CODE = new Map(CURRENCIES.map((currency) => [currency.code.toUpperCase(), currency]))

export function currencyDef(code: string): CurrencyDef | undefined {
  return BY_CODE.get(code.toUpperCase())
}

export function currencySymbol(code: string): string {
  return currencyDef(code)?.symbol ?? code.toUpperCase()
}
