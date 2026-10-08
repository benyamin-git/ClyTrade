import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/i18n/I18nProvider'
import { CalculatorLayout } from './CalculatorLayout'

function renderLayout(results: string) {
  render(
    <I18nProvider>
      <CalculatorLayout
        title="Position Size"
        subtitle="Risk-first sizing"
        docSlug="calculator-position-size"
        inputs={<span>Inputs</span>}
        results={<span>{results}</span>}
      />
    </I18nProvider>,
  )
}

describe('CalculatorLayout', () => {
  it('announces results through a live region', () => {
    renderLayout('42')

    expect(screen.getByRole('status')).toHaveTextContent('42')
  })
})
