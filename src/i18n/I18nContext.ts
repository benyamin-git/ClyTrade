import { createContext, useContext } from 'react'
import type { Locale, TextDirection } from './locales'
import type { Translator } from './translate'

export interface I18nContextValue {
  locale: Locale
  dir: TextDirection
  t: Translator
  setLocale: (locale: Locale) => void
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within an I18nProvider')
  return value
}
