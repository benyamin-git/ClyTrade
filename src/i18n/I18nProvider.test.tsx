import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getIntlContext } from '@/lib/intl'
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

function RecordingProbe({ onRender }: { onRender: (locale: string) => void }) {
  const { locale } = useI18n()
  onRender(getIntlContext().locale)
  return <span>{locale}</span>
}

describe('I18nProvider', () => {
  it('applies the preference to the document and storage', () => {
    const { getByText } = render(
      <I18nProvider preference="fa">
        <Probe />
      </I18nProvider>,
    )
    expect(getByText('fa|rtl|ژورنال')).toBeInTheDocument()
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
    expect(getByText('fa|rtl|ژورنال')).toBeInTheDocument()
  })

  it('renders english by default', () => {
    const { getByText } = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(getByText('en|ltr|Journal')).toBeInTheDocument()
  })

  it('updates the shared intl context after render, never during it', () => {
    const seen: string[] = []
    render(
      <I18nProvider preference="fa">
        <RecordingProbe onRender={(locale) => seen.push(locale)} />
      </I18nProvider>,
    )

    expect(seen[0]).toBe('en-US')
    expect(seen[seen.length - 1]).toBe('fa-IR-u-nu-latn')
    expect(getIntlContext()).toEqual({ locale: 'fa-IR-u-nu-latn', calendar: 'gregory' })
  })

  it('resets the shared intl context when it unmounts', () => {
    const { unmount } = render(
      <I18nProvider preference="fa">
        <Probe />
      </I18nProvider>,
    )
    expect(getIntlContext().locale).toBe('fa-IR-u-nu-latn')

    unmount()

    expect(getIntlContext()).toEqual({ locale: 'en-US' })
  })
})
