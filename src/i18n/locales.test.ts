import { describe, expect, it } from 'vitest'
import { detectLocale, isLocale, localeDef, LOCALES } from './locales'

describe('locales', () => {
  it('recognizes supported locales', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fa')).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })

  it('detects persian anywhere in the browser languages', () => {
    expect(detectLocale(['fa-IR'])).toBe('fa')
    expect(detectLocale(['en-US', 'fa-IR'])).toBe('fa')
    expect(detectLocale(['de-DE'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })

  it('marks persian as rtl with latin digits and the gregorian calendar', () => {
    expect(localeDef('fa')).toMatchObject({
      dir: 'rtl',
      intlLocale: 'fa-IR-u-nu-latn',
      calendar: 'gregory',
    })
    expect(localeDef('en').dir).toBe('ltr')
  })

  it('exposes both locales in stable order', () => {
    expect(LOCALES.map((locale) => locale.id)).toEqual(['en', 'fa'])
  })
})
