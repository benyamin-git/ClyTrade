import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Card } from '@/ui/components/Card'
import { HelpButton } from '@/ui/components/HelpButton'
import { ViewportPage } from '@/ui/layout/ViewportPage'

export interface CalculatorLayoutProps {
  title: string
  subtitle: string
  docSlug: string
  inputs: ReactNode
  results: ReactNode
  notices?: readonly string[]
}

export function CalculatorLayout({
  title,
  subtitle,
  docSlug,
  inputs,
  results,
  notices = [],
}: CalculatorLayoutProps) {
  const { t } = useI18n()
  return (
    <ViewportPage className="gap-4 overflow-y-auto">
      <header className="flex shrink-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          <p className="truncate text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <HelpButton docSlug={docSlug} />
      </header>

      {notices.length > 0 ? (
        <ul className="shrink-0 rounded-app-sm border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title={t('calc.inputs')}>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {inputs}
          </div>
        </Card>
        <Card title={t('calc.results')}>
          <div className="p-4">{results}</div>
        </Card>
      </div>
    </ViewportPage>
  )
}

export function ResultsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  )
}
