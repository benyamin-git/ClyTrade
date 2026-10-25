import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import type { AlertEvent, AlertEventKind, PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import {
  deleteAlert,
  listAlertEvents,
  listAlerts,
  markAllAlertEventsRead,
  resolveAlertEvent,
  updateAlert,
} from '@/data/repositories/alerts.repo'
import { listTrades, updateTrade } from '@/data/repositories/trades.repo'
import { TradeFormSheet } from '@/features/journal/components/TradeFormSheet'
import { useI18n } from '@/i18n/I18nContext'
import { priceKeyFor, type MarketRef } from '@/market/types'
import { usePrices } from '@/market/usePrices'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { AlertHistory } from '../components/AlertHistory'
import { AlertReviewList } from '../components/AlertReviewList'
import { AlertRuleFormSheet } from '../components/AlertRuleFormSheet'
import { AlertRuleList } from '../components/AlertRuleList'
import { AlertStatusStrip } from '../components/AlertStatusStrip'
import type { AlertHistoryFilter } from '../logic/alertHistory'

const REVIEW_KINDS: readonly AlertEventKind[] = ['gap', 'stale', 'conflict']

function isReviewEvent(event: AlertEvent): boolean {
  return (event.status === 'unread' || event.status === 'read') && REVIEW_KINDS.includes(event.kind)
}

function LoadingState() {
  const { t } = useI18n()
  return (
    <p role="status" className="px-4 py-6 text-sm text-on-surface-variant">
      {t('common.loading')}
    </p>
  )
}

export function AlertsPage() {
  const { t } = useI18n()
  const alerts = useLiveQuery(() => listAlerts(), [], undefined)
  const trades = useLiveQuery(() => listTrades(), [], undefined)
  const events = useLiveQuery(() => listAlertEvents(500), [], undefined)
  const [historyFilter, setHistoryFilter] = useState<AlertHistoryFilter>('all')
  const [ruleForm, setRuleForm] = useState<{ alert: PriceAlert | null } | null>(null)
  const [tradeForm, setTradeForm] = useState<{ trade: Trade } | null>(null)
  const [deleting, setDeleting] = useState<PriceAlert | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refs = useMemo<MarketRef[]>(() => {
    const byKey = new Map<string, MarketRef>()
    for (const rule of alerts ?? []) {
      if (!rule.enabled) continue
      const ref: MarketRef = {
        key: priceKeyFor(rule),
        symbol: rule.symbol,
        binanceSymbol: rule.binanceSymbol,
        coingeckoId: rule.coingeckoId,
      }
      byKey.set(ref.key, ref)
    }
    for (const trade of trades ?? []) {
      if (trade.status !== 'open') continue
      if (trade.targetPrice === null && trade.stopPrice === null) continue
      const ref: MarketRef = {
        key: priceKeyFor(trade),
        symbol: trade.symbol,
        binanceSymbol: trade.binanceSymbol,
        coingeckoId: trade.coingeckoId,
      }
      byKey.set(ref.key, ref)
    }
    return [...byKey.values()]
  }, [alerts, trades])

  const { status, refresh } = usePrices(refs, 'alerts')
  const reviewEvents = useMemo(() => (events ?? []).filter(isReviewEvent), [events])
  const statusLabel = t('alerts.sections.status')
  const rulesLabel = t('alerts.sections.rules')
  const reviewLabel = t('alerts.sections.review')
  const historyLabel = t('alerts.sections.history')

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refresh().catch(() => undefined)
    } finally {
      setRefreshing(false)
    }
  }

  function handleToggle(rule: PriceAlert) {
    void updateAlert(rule.id, { enabled: !rule.enabled }).catch(() => undefined)
  }

  function handleCloseAt(event: AlertEvent, level: 'target' | 'stop') {
    const tradeId = event.tradeId
    const price = level === 'target' ? event.targetPrice : event.stopPrice
    if (tradeId === null || price === null) return
    void (async () => {
      await updateTrade(tradeId, { status: 'closed', exitPrice: price, closedAt: event.at })
      await resolveAlertEvent(event.id, level)
    })().catch(() => undefined)
  }

  function handleEditReview(event: AlertEvent) {
    if (event.tradeId !== null) {
      const trade = trades?.find((entry) => entry.id === event.tradeId)
      if (trade) setTradeForm({ trade })
      return
    }
    if (event.ruleId !== null) {
      const rule = alerts?.find((entry) => entry.id === event.ruleId)
      if (rule) setRuleForm({ alert: rule })
    }
  }

  function handleDismiss(event: AlertEvent) {
    void resolveAlertEvent(event.id, 'dismiss').catch(() => undefined)
  }

  function handleMarkAllRead() {
    void markAllAlertEventsRead().catch(() => undefined)
  }

  return (
    <ViewportPage className="gap-3 overflow-y-auto">
      <Card
        className="shrink-0"
        title={statusLabel}
        aria-label={statusLabel}
        data-testid="alerts-status"
      >
        <AlertStatusStrip
          status={status}
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
        />
      </Card>

      <Card
        className="shrink-0"
        title={rulesLabel}
        aria-label={rulesLabel}
        data-testid="alerts-rules"
      >
        <div className="flex shrink-0 items-center justify-end px-4 pt-3">
          <Button size="sm" icon={<Plus />} onClick={() => setRuleForm({ alert: null })}>
            {t('alerts.form.add')}
          </Button>
        </div>

        {alerts === undefined || trades === undefined ? (
          <LoadingState />
        ) : (
          <AlertRuleList
            rules={alerts}
            trades={trades}
            onEdit={(rule) => setRuleForm({ alert: rule })}
            onDelete={setDeleting}
            onToggle={handleToggle}
            onEditTrade={(trade) => setTradeForm({ trade })}
          />
        )}
      </Card>

      <Card
        className="shrink-0"
        title={reviewLabel}
        aria-label={reviewLabel}
        data-testid="alerts-review"
      >
        {events === undefined ? (
          <LoadingState />
        ) : (
          <AlertReviewList
            events={reviewEvents}
            onCloseAt={handleCloseAt}
            onEdit={handleEditReview}
            onDismiss={handleDismiss}
            onRefresh={() => void handleRefresh()}
          />
        )}
      </Card>

      <Card
        className="shrink-0"
        title={historyLabel}
        aria-label={historyLabel}
        data-testid="alerts-history"
      >
        {events === undefined ? (
          <LoadingState />
        ) : (
          <AlertHistory
            events={events}
            filter={historyFilter}
            onMarkAllRead={handleMarkAllRead}
            onFilter={setHistoryFilter}
          />
        )}
      </Card>

      {ruleForm ? (
        <AlertRuleFormSheet alert={ruleForm.alert} onClose={() => setRuleForm(null)} />
      ) : null}

      {tradeForm ? (
        <TradeFormSheet trade={tradeForm.trade} onClose={() => setTradeForm(null)} />
      ) : null}

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
