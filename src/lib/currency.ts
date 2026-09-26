export interface CurrencyDef {
  code: string
  symbol: string
  label: string
  customSymbol?: boolean
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
  { code: 'IRT', symbol: 'تومان', label: 'Iranian Toman', customSymbol: true },
]

export const DEFAULT_CURRENCY = 'USD'

const BY_CODE = new Map(CURRENCIES.map((currency) => [currency.code.toUpperCase(), currency]))

export function currencyDef(code: string): CurrencyDef | undefined {
  return BY_CODE.get(code.toUpperCase())
}

export function currencySymbol(code: string): string {
  return currencyDef(code)?.symbol ?? code.toUpperCase()
}
