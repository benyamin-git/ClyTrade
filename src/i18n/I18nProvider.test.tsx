import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from './I18nProvider'
import { LANGUAGE_STORAGE_KEY } from './locales'
import { useI18n } from './I18nContext'

function Probe() {
  const { locale, dir, t } = useI18n()
  return (
    <span>
      {locale}|{dir}|{t('nav.journal')}
    </span>
  )
}

describe('I18nProvider', () => {
  it('applies the preference to the document and storage', () => {
    const { getByText } = render(
      <I18nProvider preference="fa">
        <Probe />
      </I18nProvider>,
    )
    expect(getByText('fa|rtl|دفتر معاملات')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('fa')
    expect(document.documentElement.dir).toBe('rtl')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fa')
  })

  it('falls back to the stored language when uncontrolled', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fa')
    const { getByText } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(getByText('fa|rtl|دفتر معاملات')).toBeInTheDocument()
  })

  it('renders english by default', () => {
    const { getByText } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(getByText('en|ltr|Journal')).toBeInTheDocument()
  })
})
