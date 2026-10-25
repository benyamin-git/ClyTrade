import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { AlertsPage } from './AlertsPage'

function renderPage(locale: 'en' | 'fa' = 'en') {
  return render(
    <I18nProvider preference={locale}>
      <AlertsPage />
    </I18nProvider>,
  )
}

afterEach(() => {
  document.documentElement.dir = ''
  document.documentElement.lang = 'en'
})

describe('AlertsPage', () => {
  it('renders the status, rules, review and history regions', () => {
    renderPage()

    expect(screen.getByRole('region', { name: 'Price status' })).toBe(
      screen.getByTestId('alerts-status'),
    )
    expect(screen.getByRole('region', { name: 'Active rules' })).toBe(
      screen.getByTestId('alerts-rules'),
    )
    expect(screen.getByRole('region', { name: 'Needs review' })).toBe(
      screen.getByTestId('alerts-review'),
    )
    expect(screen.getByRole('region', { name: 'History' })).toBe(
      screen.getByTestId('alerts-history'),
    )
  })

  it('shows the empty placeholders before any rule or event exists', () => {
    renderPage()

    expect(
      screen.getByText('Live price status will appear here once monitoring starts.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No alert rules yet')).toBeInTheDocument()
    expect(screen.getByText('Nothing needs review')).toBeInTheDocument()
    expect(screen.getByText('No alerts yet')).toBeInTheDocument()
  })

  it('renders in Persian and right-to-left', () => {
    renderPage('fa')

    expect(screen.getByRole('region', { name: 'وضعیت قیمت' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'قواعد فعال' })).toBeInTheDocument()
    expect(screen.getByText('هنوز قاعدهٔ هشداری ندارید')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })
})
