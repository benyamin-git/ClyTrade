import { en, type Dictionary } from './en'
import { fa } from './fa'

export type Locale = 'en' | 'fa'
export type TextDirection = 'ltr' | 'rtl'

export interface LocaleDef {
  id: Locale
  label: string
  intlLocale: string
  dir: TextDirection
  calendar?: string
}

export const LOCALE_DEFS: Record<Locale, LocaleDef> = {
  en: { id: 'en', label: 'English', intlLocale: 'en-US', dir: 'ltr' },
  fa: {
    id: 'fa',
    label: 'فارسی',
    intlLocale: 'fa-IR-u-nu-latn',
    dir: 'rtl',
    calendar: 'gregory',
  },
}

export const LOCALES: readonly LocaleDef[] = Object.values(LOCALE_DEFS)

export const DICTIONARIES: Record<Locale, Dictionary> = { en, fa }

export const DEFAULT_LOCALE: Locale = 'en'

export const LANGUAGE_STORAGE_KEY = 'clytrade.language'

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'fa'
}

export function localeDef(locale: Locale): LocaleDef {
  return LOCALE_DEFS[locale]
}

export function detectLocale(languages?: readonly string[]): Locale {
  const candidates =
    languages ??
    (typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]))
  for (const candidate of candidates) {
    if (candidate.toLowerCase().startsWith('fa')) return 'fa'
  }
  return DEFAULT_LOCALE
}

export function readStoredLanguage(): Locale | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    return null
  }
}

export function writeStoredLanguage(locale: Locale): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
  } catch {
    return
  }
}
