export interface CurrencyDef {
  code: string
  symbol: string
  label: string
}

export const CURRENCIES: readonly CurrencyDef[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr', label: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CNY', symbol: 'CN¥', label: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩', label: 'South Korean Won' },
  { code: 'TRY', symbol: '₺', label: 'Turkish Lira' },
]

export const DEFAULT_CURRENCY = 'USD'

const SYMBOLS = new Map(CURRENCIES.map((currency) => [currency.code, currency.symbol]))

export function currencySymbol(code: string): string {
  return SYMBOLS.get(code.toUpperCase()) ?? code.toUpperCase()
}
