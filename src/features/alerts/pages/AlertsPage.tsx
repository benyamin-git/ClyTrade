import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import type { AlertEvent, PriceAlert } from '@/data/models/price'
import type { Trade } from '@/data/models/trade'
import {
  clearAlertEvents,
  deleteAlert,
  deleteAlertEvent,
  dismissAlertEvent,
  listAlertEvents,
  listAlerts,
  markAllAlertEventsRead,
  resolveAlertEvent,
  updateAlert,
} from '@/data/repositories/alerts.repo'
import { getPriceCache } from '@/data/repositories/prices.repo'
import { getTrade, listTrades, updateTrade } from '@/data/repositories/trades.repo'
import { TradeFormSheet } from '@/features/journal/components/TradeFormSheet'
import { useI18n } from '@/i18n/I18nContext'
import { priceKeyFor, STALE_MS, type MarketRef } from '@/market/types'
import { usePrices } from '@/market/usePrices'
import { Button } from '@/ui/components/Button'
import { Sheet } from '@/ui/components/Sheet'
import { ViewportPage } from '@/ui/layout/ViewportPage'
import { AlertActivity } from '../components/AlertActivity'
import { AlertRuleFormSheet } from '../components/AlertRuleFormSheet'
import { AlertRuleList } from '../components/AlertRuleList'
import { AlertStatusLine } from '../components/AlertStatusLine'
import { AlertStatusStrip } from '../components/AlertStatusStrip'
import { BackgroundMonitoringCard } from '../components/BackgroundMonitoringCard'
import { isReviewEvent } from '../logic/alertActivity'
import { useCooldownActive } from '../logic/useCooldownActive'

function mergeRef(byKey: Map<string, MarketRef>, ref: MarketRef): void {
  const existing = byKey.get(ref.key)
  if (!existing) {
    byKey.set(ref.key, ref)
    return
  }
  byKey.set(ref.key, {
    ...existing,
    binanceSymbol: existing.binanceSymbol ?? ref.binanceSymbol,
    coingeckoId: existing.coingeckoId ?? ref.coingeckoId,
  })
}

function eventPriceKeys(
  event: AlertEvent,
  rules: readonly PriceAlert[],
  trades: readonly Trade[],
  refs: readonly MarketRef[],
): string[] {
  const keys = new Set<string>()
  if (event.tradeId !== null) {
    const trade = trades.find((entry) => entry.id === event.tradeId)
    if (trade) keys.add(priceKeyFor(trade))
  }
  if (event.ruleId !== null) {
    const rule = rules.find((entry) => entry.id === event.ruleId)
    if (rule) keys.add(priceKeyFor(rule))
  }
  const symbol = event.symbol.trim().toUpperCase()
  for (const ref of refs) {
    if (ref.symbol.trim().toUpperCase() === symbol) keys.add(ref.key)
  }
  return [...keys]
}

async function hasFreshPrice(keys: readonly string[]): Promise<boolean> {
  for (const key of keys) {
    const entry = await getPriceCache(key)
    if (entry !== undefined && Date.now() - entry.fetchedAt < STALE_MS) return true
  }
  return false
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
  const [statusOpen, setStatusOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState<{
    alert: PriceAlert | null
    reviewEventId?: string
  } | null>(null)
  const [tradeForm, setTradeForm] = useState<{ trade: Trade; reviewEventId?: string } | null>(null)
  const [deleting, setDeleting] = useState<PriceAlert | null>(null)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const refs = useMemo<MarketRef[]>(() => {
    const byKey = new Map<string, MarketRef>()
    for (const rule of alerts ?? []) {
      if (!rule.enabled) continue
      if (rule.binanceSymbol === null && rule.coingeckoId === null) continue
      mergeRef(byKey, {
        key: priceKeyFor(rule),
        symbol: rule.symbol,
        binanceSymbol: rule.binanceSymbol,
        coingeckoId: rule.coingeckoId,
      })
    }
    for (const trade of trades ?? []) {
      if (trade.market !== 'crypto') continue
      if (trade.status !== 'open') continue
      if (trade.targetPrice === null && trade.stopPrice === null) continue
      if (trade.binanceSymbol === null && trade.coingeckoId === null) continue
      mergeRef(byKey, {
        key: priceKeyFor(trade),
        symbol: trade.symbol,
        binanceSymbol: trade.binanceSymbol,
        coingeckoId: trade.coingeckoId,
      })
    }
    return [...byKey.values()]
  }, [alerts, trades])

  const { prices, status, refresh } = usePrices(refs, 'alerts')
  const cooldownActive = useCooldownActive(status.nextAllowedAt)
  const refreshDisabled = refreshing || cooldownActive
  const reviewEvents = useMemo(() => (events ?? []).filter(isReviewEvent), [events])
  const unreadCount = (events ?? []).filter((event) => event.status === 'unread').length
  const statusLabel = t('alerts.sections.status')
  const rulesLabel = t('alerts.sections.rules')
  const activityLabel = t('alerts.sections.activity')

  async function runRefresh() {
    setRefreshing(true)
    try {
      await refresh().catch(() => undefined)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleRefreshReview(event: AlertEvent) {
    await runRefresh()
    const keys = eventPriceKeys(event, alerts ?? [], trades ?? [], refs)
    const fresh = await hasFreshPrice(keys).catch(() => false)
    if (fresh) {
      await resolveAlertEvent(event.id, 'refresh').catch(() => undefined)
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
      const trade = await getTrade(tradeId)
      const unchanged =
        trade !== undefined &&
        trade.status === 'open' &&
        trade.targetPrice === event.targetPrice &&
        trade.stopPrice === event.stopPrice
      if (!unchanged) {
        await dismissAlertEvent(event.id)
        setReviewError(t('alerts.review.tradeChanged'))
        return
      }
      setReviewError(null)
      await updateTrade(tradeId, { status: 'closed', exitPrice: price, closedAt: event.at })
      await resolveAlertEvent(event.id, level)
    })().catch(() => undefined)
  }

  function handleEditReview(event: AlertEvent) {
    if (event.tradeId !== null) {
      const trade = trades?.find((entry) => entry.id === event.tradeId)
      if (trade) setTradeForm({ trade, reviewEventId: event.id })
      return
    }
    if (event.ruleId !== null) {
      const rule = alerts?.find((entry) => entry.id === event.ruleId)
      if (rule) setRuleForm({ alert: rule, reviewEventId: event.id })
    }
  }

  function handleDismiss(event: AlertEvent) {
    setReviewError(null)
    void dismissAlertEvent(event.id).catch(() => undefined)
  }

  function resolveEditedReview(reviewEventId: string | undefined) {
    if (reviewEventId === undefined) return
    void resolveAlertEvent(reviewEventId, 'edit').catch(() => undefined)
  }

  function handleMarkAllRead() {
    void markAllAlertEventsRead().catch(() => undefined)
  }

  function handleDeleteEvent(event: AlertEvent) {
    void deleteAlertEvent(event.id).catch(() => undefined)
  }

  function handleClearHistory() {
    void clearAlertEvents().catch(() => undefined)
    setClearingHistory(false)
  }

  return (
    <ViewportPage className="gap-5 overflow-y-auto">
      <AlertStatusLine
        status={status}
        onOpen={() => setStatusOpen(true)}
        onRefresh={() => void runRefresh()}
        refreshDisabled={refreshDisabled}
        refreshing={refreshing}
      />

      <section aria-label={rulesLabel} data-testid="alerts-rules" className="flex flex-col gap-3">
        <header className="flex flex-wrap items-center gap-3">
          <h2 className="min-w-0 truncate text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
            {rulesLabel}
          </h2>
          <Button
            size="sm"
            icon={<Plus />}
            className="ms-auto"
            onClick={() => setRuleForm({ alert: null })}
          >
            {t('alerts.form.add')}
          </Button>
        </header>
        {alerts === undefined || trades === undefined ? (
          <LoadingState />
        ) : (
          <AlertRuleList
            rules={alerts}
            trades={trades}
            prices={prices}
            onEdit={(rule) => setRuleForm({ alert: rule })}
            onDelete={setDeleting}
            onToggle={handleToggle}
            onEditTrade={(trade) => setTradeForm({ trade })}
          />
        )}
      </section>

      <section
        aria-label={activityLabel}
        data-testid="alerts-activity"
        className="flex flex-col gap-3"
      >
        <header className="flex flex-wrap items-center gap-3">
          <h2 className="min-w-0 truncate text-xs font-semibold tracking-wide text-on-surface-variant uppercase">
            {activityLabel}
          </h2>
          {reviewEvents.length === 0 ? null : (
            <span className="rounded-app-full bg-warning/15 px-2 py-0.5 text-2xs font-medium text-warning">
              {reviewEvents.length}
            </span>
          )}
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outlined"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              {t('alerts.history.markAllRead')}
            </Button>
            <Button
              size="sm"
              variant="text"
              onClick={() => setClearingHistory(true)}
              disabled={(events ?? []).length === 0}
            >
              {t('alerts.history.clear')}
            </Button>
          </div>
        </header>
        {reviewError ? (
          <p role="alert" className="text-xs text-error">
            {reviewError}
          </p>
        ) : null}
        {events === undefined ? (
          <LoadingState />
        ) : (
          <AlertActivity
            events={events}
            trades={trades ?? []}
            refreshDisabled={refreshDisabled}
            onCloseAt={handleCloseAt}
            onEdit={handleEditReview}
            onDismiss={handleDismiss}
            onRefresh={(event) => void handleRefreshReview(event)}
            onDelete={handleDeleteEvent}
          />
        )}
      </section>

      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title={statusLabel}>
        <div className="flex flex-col gap-5">
          <AlertStatusStrip status={status} />
          <BackgroundMonitoringCard />
        </div>
      </Sheet>

      {ruleForm ? (
        <AlertRuleFormSheet
          alert={ruleForm.alert}
          onClose={() => setRuleForm(null)}
          onSaved={() => resolveEditedReview(ruleForm.reviewEventId)}
        />
      ) : null}

      {tradeForm ? (
        <TradeFormSheet
          trade={tradeForm.trade}
          onClose={() => setTradeForm(null)}
          onSaved={() => resolveEditedReview(tradeForm.reviewEventId)}
        />
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

      <Sheet
        open={clearingHistory}
        onClose={() => setClearingHistory(false)}
        title={t('alerts.history.clearTitle')}
        footer={
          <>
            <Button variant="text" onClick={() => setClearingHistory(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleClearHistory}>
              {t('alerts.history.clear')}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {t('alerts.history.clearConfirm', { count: events?.length ?? 0 })}
        </p>
      </Sheet>
    </ViewportPage>
  )
}
