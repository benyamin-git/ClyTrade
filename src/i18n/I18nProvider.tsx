import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setIntlContext } from '@/lib/intl'
import { I18nContext, type I18nContextValue } from './I18nContext'
import {
  DICTIONARIES,
  detectLocale,
  isLocale,
  localeDef,
  readStoredLanguage,
  writeStoredLanguage,
  type Locale,
} from './locales'
import { createTranslator } from './translate'

export interface I18nProviderProps {
  children: ReactNode
  preference?: Locale | null
  onPreferenceChange?: (locale: Locale) => void
}

export function I18nProvider({ children, preference, onPreferenceChange }: I18nProviderProps) {
  const [autoLocale, setAutoLocale] = useState<Locale>(() => readStoredLanguage() ?? detectLocale())
  const locale = preference ?? autoLocale
  const def = localeDef(locale)

  setIntlContext({ locale: def.intlLocale, calendar: def.calendar })

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = def.dir
    writeStoredLanguage(locale)
  }, [locale, def.dir])

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return
      setAutoLocale(next)
      onPreferenceChange?.(next)
    },
    [onPreferenceChange],
  )

  const t = useMemo(() => createTranslator(DICTIONARIES[locale]), [locale])

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: def.dir, t, setLocale }),
    [locale, def.dir, t, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
