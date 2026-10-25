import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bell, CircleAlert, History, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import type { PriceAlert } from '@/data/models/price'
import { deleteAlert, listAlerts, updateAlert } from '@/data/repositories/alerts.repo'
import { useI18n } from '@/i18n/I18nContext'
import type { Translator } from '@/i18n/translate'
import { formatPercent, formatPrice } from '@/lib/format'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { EmptyState } from '@/ui/components/EmptyState'
import { IconButton } from '@/ui/components/IconButton'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { AlertRuleFormSheet } from '../components/AlertRuleFormSheet'

function ruleSummary(rule: PriceAlert, t: Translator): string {
  if (rule.kind === 'percent') {
    const percent = rule.percent === null ? '—' : formatPercent(rule.percent)
    if (rule.percentDirection === 'down') return t('alerts.rules.summary.percentDown', { percent })
    if (rule.percentDirection === 'both') return t('alerts.rules.summary.percentBoth', { percent })
    return t('alerts.rules.summary.percentUp', { percent })
  }

  if (rule.priceMode === 'range') {
    return t('alerts.rules.summary.range', {
      low: rule.rangeLow === null ? '—' : formatPrice(rule.rangeLow),
      high: rule.rangeHigh === null ? '—' : formatPrice(rule.rangeHigh),
    })
  }

  const level = rule.level === null ? '—' : formatPrice(rule.level)
  if (rule.priceMode === 'below') return t('alerts.rules.summary.below', { level })
  if (rule.priceMode === 'crossing') return t('alerts.rules.summary.crossing', { level })
  return t('alerts.rules.summary.above', { level })
}

export function AlertsPage() {
  const { t } = useI18n()
  const alerts = useLiveQuery(() => listAlerts(), [], undefined) ?? []
  const [form, setForm] = useState<{ alert: PriceAlert | null } | null>(null)
  const [deleting, setDeleting] = useState<PriceAlert | null>(null)
  const statusLabel = t('alerts.sections.status')
  const rulesLabel = t('alerts.sections.rules')
  const reviewLabel = t('alerts.sections.review')
  const historyLabel = t('alerts.sections.history')

  return (
    <ViewportPage className="gap-3 overflow-y-auto">
      <Card
        className="shrink-0"
        title={statusLabel}
        aria-label={statusLabel}
        data-testid="alerts-status"
      >
        <p className="px-4 py-3 text-sm text-on-surface-variant">
          {t('alerts.status.placeholder')}
        </p>
      </Card>

      <Card
        className="shrink-0"
        title={rulesLabel}
        aria-label={rulesLabel}
        data-testid="alerts-rules"
      >
        <div className="flex shrink-0 items-center justify-end px-4 pt-3">
          <Button size="sm" icon={<Plus />} onClick={() => setForm({ alert: null })}>
            {t('alerts.form.add')}
          </Button>
        </div>

        {alerts.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title={t('alerts.rules.emptyTitle')}
            description={t('alerts.rules.emptyDescription')}
          />
        ) : (
          <ul className="min-h-0 divide-y divide-outline-variant/40 overflow-y-auto">
            {alerts.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{rule.symbol}</span>
                    {rule.enabled ? null : (
                      <span className="rounded-app-full bg-surface-container-highest px-1.5 py-0.5 text-2xs font-medium text-on-surface-variant">
                        {t('alerts.rules.paused')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant">{ruleSummary(rule, t)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label={
                      rule.enabled
                        ? t('alerts.rules.pauseAria', { symbol: rule.symbol })
                        : t('alerts.rules.resumeAria', { symbol: rule.symbol })
                    }
                    size="sm"
                    onClick={() => {
                      void updateAlert(rule.id, { enabled: !rule.enabled }).catch(() => undefined)
                    }}
                  >
                    {rule.enabled ? <Pause /> : <Play />}
                  </IconButton>
                  <IconButton
                    label={t('alerts.rules.editAria', { symbol: rule.symbol })}
                    size="sm"
                    onClick={() => setForm({ alert: rule })}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    label={t('alerts.rules.deleteAria', { symbol: rule.symbol })}
                    size="sm"
                    onClick={() => setDeleting(rule)}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        className="shrink-0"
        title={reviewLabel}
        aria-label={reviewLabel}
        data-testid="alerts-review"
      >
        <EmptyState
          icon={<CircleAlert />}
          title={t('alerts.review.emptyTitle')}
          description={t('alerts.review.emptyDescription')}
        />
      </Card>

      <Card
        className="shrink-0"
        title={historyLabel}
        aria-label={historyLabel}
        data-testid="alerts-history"
      >
        <EmptyState
          icon={<History />}
          title={t('alerts.history.emptyTitle')}
          description={t('alerts.history.emptyDescription')}
        />
      </Card>

      {form ? <AlertRuleFormSheet alert={form.alert} onClose={() => setForm(null)} /> : null}

      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('alerts.rules.deleteTitle')}
        footer={
          <>
            <Button variant="text" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) {
                  void deleteAlert(deleting.id).catch(() => undefined)
                }
                setDeleting(null)
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {t('alerts.rules.deleteConfirm', { symbol: deleting?.symbol ?? '' })}
        </p>
      </Sheet>
    </ViewportPage>
  )
}
